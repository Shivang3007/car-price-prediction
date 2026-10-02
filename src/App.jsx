import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:5000";

function App() {
  const [activeTab, setActiveTab] = useState("recommend");

  // ============================================================
  // OPTIONS
  // ============================================================

  const [options, setOptions] = useState({
    brands: [],
    brand_models: {},
    model_variants: {},
    fuels: [],
    transmissions: [],
    owners: [],
    seats: [],
  });

  // ============================================================
  // RECOMMENDATION FORM
  // ============================================================

  const [recommendForm, setRecommendForm] = useState({
    budget: 1000000,
    fuel: "",
    transmission: "",
    mileage: "",
    seats: "",
    max_distance: "",
    max_age: "",
  });

  const [recommendations, setRecommendations] = useState([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState("");

  // ============================================================
  // PREDICTION FORM
  // ============================================================

  const [predictionForm, setPredictionForm] = useState({
    brand: "",
    model: "",
    variant: "",
    year: 2022,
    distance: 30000,
    engine_cc: 1200,
    mileage: 18,
    seats: 5,
    fuel: "",
    transmission: "",
    owner: "",
  });

  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState("");

  // ============================================================
  // SELECTED CAR MODAL
  // ============================================================

  const [selectedCar, setSelectedCar] = useState(null);

  // ============================================================
  // LOAD DATASET OPTIONS
  // ============================================================

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await fetch(`${API_URL}/options`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Unable to load dataset options."
          );
        }

        setOptions(data);

        const firstBrand = data.brands?.[0] || "";

        const firstModel =
          data.brand_models?.[firstBrand]?.[0] || "";

        const firstVariant =
          data.model_variants?.[
            `${firstBrand}|||${firstModel}`
          ]?.[0] || "";

        setPredictionForm((prev) => ({
          ...prev,

          brand: firstBrand,

          model: firstModel,

          variant: firstVariant,

          fuel: data.fuels?.[0] || "",

          transmission:
            data.transmissions?.[0] || "",

          owner:
            data.owners?.[0] || "",

          seats:
            data.seats?.[0] || 5,
        }));
      } catch (error) {
        console.error("Options loading error:", error);

        setPredictionError(
          "Backend se dataset options load nahi ho pa rahe hain."
        );
      }
    };

    loadOptions();
  }, []);

  // ============================================================
  // DEPENDENT DROPDOWN DATA
  // ============================================================

  const availableModels = useMemo(() => {
    if (!predictionForm.brand) {
      return [];
    }

    return (
      options.brand_models?.[
        predictionForm.brand
      ] || []
    );
  }, [
    options.brand_models,
    predictionForm.brand,
  ]);

  const variantKey =
    predictionForm.brand && predictionForm.model
      ? `${predictionForm.brand}|||${predictionForm.model}`
      : "";

  const availableVariants = useMemo(() => {
    if (!variantKey) {
      return [];
    }

    return (
      options.model_variants?.[
        variantKey
      ] || []
    );
  }, [
    options.model_variants,
    variantKey,
  ]);

  // ============================================================
  // RECOMMENDATION INPUT CHANGE
  // ============================================================

  const handleRecommendChange = (field, value) => {
    setRecommendForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ============================================================
  // PREDICTION INPUT CHANGE
  // ============================================================

  const handlePredictionChange = (field, value) => {
    setPredictionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ============================================================
  // BRAND CHANGE
  // ============================================================

  const handleBrandChange = (brand) => {
    const models =
      options.brand_models?.[brand] || [];

    const firstModel =
      models[0] || "";

    const variants =
      options.model_variants?.[
        `${brand}|||${firstModel}`
      ] || [];

    setPredictionForm((prev) => ({
      ...prev,

      brand,

      model: firstModel,

      variant: variants[0] || "",
    }));

    setPredictionError("");
    setPredictionResult(null);
  };

  // ============================================================
  // MODEL CHANGE
  // ============================================================

  const handleModelChange = (model) => {
    const variants =
      options.model_variants?.[
        `${predictionForm.brand}|||${model}`
      ] || [];

    setPredictionForm((prev) => ({
      ...prev,

      model,

      variant: variants[0] || "",
    }));

    setPredictionError("");
    setPredictionResult(null);
  };

  // ============================================================
  // RECOMMEND CARS
  // ============================================================

  const getRecommendations = async () => {
    try {
      setRecommendLoading(true);
      setRecommendError("");
      setRecommendations([]);

      const response = await fetch(
        `${API_URL}/recommend`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            budget:
              recommendForm.budget === ""
                ? 0
                : Number(
                    recommendForm.budget
                  ),

            fuel:
              recommendForm.fuel || null,

            transmission:
              recommendForm.transmission ||
              null,

            mileage:
              recommendForm.mileage === ""
                ? null
                : Number(
                    recommendForm.mileage
                  ),

            seats:
              recommendForm.seats === ""
                ? null
                : Number(
                    recommendForm.seats
                  ),

            max_distance:
              recommendForm.max_distance === ""
                ? null
                : Number(
                    recommendForm.max_distance
                  ),

            max_age:
              recommendForm.max_age === ""
                ? null
                : Number(
                    recommendForm.max_age
                  ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to get recommendations."
        );
      }

      setRecommendations(
        data.results || []
      );
    } catch (error) {
      console.error(
        "Recommendation error:",
        error
      );

      setRecommendError(
        error.message ||
          "Something went wrong while getting recommendations."
      );
    } finally {
      setRecommendLoading(false);
    }
  };

  // ============================================================
  // PREDICT PRICE
  // ============================================================

  const predictPrice = async () => {
    try {
      setPredictionLoading(true);
      setPredictionError("");
      setPredictionResult(null);

      if (!predictionForm.brand) {
        throw new Error(
          "Please select a brand."
        );
      }

      if (!predictionForm.model) {
        throw new Error(
          "Please select a model."
        );
      }

      if (!predictionForm.variant) {
        throw new Error(
          "Please select a variant."
        );
      }

      const response = await fetch(
        `${API_URL}/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            brand:
              predictionForm.brand,

            model:
              predictionForm.model,

            variant:
              predictionForm.variant,

            year:
              Number(
                predictionForm.year
              ),

            distance:
              Number(
                predictionForm.distance
              ),

            engine_cc:
              Number(
                predictionForm.engine_cc
              ),

            mileage:
              predictionForm.mileage === ""
                ? null
                : Number(
                    predictionForm.mileage
                  ),

            seats:
              Number(
                predictionForm.seats
              ),

            fuel:
              predictionForm.fuel,

            transmission:
              predictionForm.transmission,

            owner:
              predictionForm.owner,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Price prediction failed."
        );
      }

      setPredictionResult(data);
    } catch (error) {
      console.error(
        "Prediction error:",
        error
      );

      setPredictionError(
        error.message ||
          "Unable to predict price."
      );
    } finally {
      setPredictionLoading(false);
    }
  };

  // ============================================================
  // FORMAT PRICE
  // ============================================================

  const formatPrice = (price) => {
    if (
      price === null ||
      price === undefined ||
      Number.isNaN(Number(price))
    ) {
      return "₹0";
    }

    return `₹${Number(price).toLocaleString(
      "en-IN"
    )}`;
  };

  // ============================================================
  // FORMAT DISTANCE
  // ============================================================

  const formatDistance = (distance) => {
    if (
      distance === null ||
      distance === undefined
    ) {
      return "-";
    }

    return `${Number(distance).toLocaleString(
      "en-IN"
    )} km`;
  };

  // ============================================================
  // APP UI
  // ============================================================

  return (
    <div className="app">

      {/* ======================================================
          HERO
          ====================================================== */}

      <header className="hero">

        <div className="hero-content">

          <div className="hero-badge">
            AI POWERED AUTOMOTIVE INTELLIGENCE
          </div>

          <h1>
            Car Price Prediction
            <br />
            <span>
              & Recommendation
            </span>
          </h1>

          <p>
            Predict used-car prices and discover
            vehicles that match your requirements.
          </p>

        </div>

      </header>


      {/* ======================================================
          TABS
          ====================================================== */}

      <div className="main-tabs">

        <button
          type="button"
          className={
            activeTab === "recommend"
              ? "main-tab active"
              : "main-tab"
          }
          onClick={() =>
            setActiveTab("recommend")
          }
        >
          <span>🚗</span>
          Car Recommendation
        </button>

        <button
          type="button"
          className={
            activeTab === "predict"
              ? "main-tab active"
              : "main-tab"
          }
          onClick={() =>
            setActiveTab("predict")
          }
        >
          <span>₹</span>
          Price Prediction
        </button>

      </div>


      <main className="main-content">

        {/* ====================================================
            RECOMMENDATION TAB
            ==================================================== */}

        {activeTab === "recommend" && (

          <>

            <section className="search-card">

              <div className="section-title">

                <div>

                  <span className="section-kicker">
                    FIND YOUR CAR
                  </span>

                  <h2>
                    Tell us what you need
                  </h2>

                  <p>
                    Set your requirements and
                    our recommendation engine
                    will find suitable cars.
                  </p>

                </div>

              </div>


              <div className="form-grid">

                {/* Budget */}

                <div className="field">

                  <label>
                    Maximum Budget
                  </label>

                  <div className="input-with-prefix">

                    <span>₹</span>

                    <input
                      type="number"
                      min="0"
                      value={
                        recommendForm.budget
                      }
                      onChange={(e) =>
                        handleRecommendChange(
                          "budget",
                          e.target.value
                        )
                      }
                      placeholder="e.g. 1000000"
                    />

                  </div>

                </div>


                {/* Fuel */}

                <div className="field">

                  <label>
                    Fuel Type
                  </label>

                  <select
                    value={
                      recommendForm.fuel
                    }
                    onChange={(e) =>
                      handleRecommendChange(
                        "fuel",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Any Fuel
                    </option>

                    {options.fuels.map(
                      (fuel) => (

                        <option
                          key={fuel}
                          value={fuel}
                        >
                          {fuel}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* Transmission */}

                <div className="field">

                  <label>
                    Transmission
                  </label>

                  <select
                    value={
                      recommendForm.transmission
                    }
                    onChange={(e) =>
                      handleRecommendChange(
                        "transmission",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Any Transmission
                    </option>

                    {options.transmissions.map(
                      (transmission) => (

                        <option
                          key={transmission}
                          value={transmission}
                        >
                          {transmission}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* Mileage */}

                <div className="field">

                  <label>
                    Minimum Mileage
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      recommendForm.mileage
                    }
                    onChange={(e) =>
                      handleRecommendChange(
                        "mileage",
                        e.target.value
                      )
                    }
                    placeholder="e.g. 15"
                  />

                </div>


                {/* Seats */}

                <div className="field">

                  <label>
                    Minimum Seats
                  </label>

                  <select
                    value={
                      recommendForm.seats
                    }
                    onChange={(e) =>
                      handleRecommendChange(
                        "seats",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Any Seats
                    </option>

                    {options.seats.map(
                      (seat) => (

                        <option
                          key={seat}
                          value={seat}
                        >
                          {seat} Seats
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* Distance */}

                <div className="field">

                  <label>
                    Maximum Distance
                  </label>

                  <div className="input-with-suffix">

                    <input
                      type="number"
                      min="0"
                      value={
                        recommendForm.max_distance
                      }
                      onChange={(e) =>
                        handleRecommendChange(
                          "max_distance",
                          e.target.value
                        )
                      }
                      placeholder="e.g. 50000"
                    />

                    <span>km</span>

                  </div>

                </div>


                {/* Age */}

                <div className="field">

                  <label>
                    Maximum Car Age
                  </label>

                  <div className="input-with-suffix">

                    <input
                      type="number"
                      min="0"
                      value={
                        recommendForm.max_age
                      }
                      onChange={(e) =>
                        handleRecommendChange(
                          "max_age",
                          e.target.value
                        )
                      }
                      placeholder="e.g. 5"
                    />

                    <span>years</span>

                  </div>

                </div>

              </div>


              <button
                className="primary-btn"
                type="button"
                onClick={
                  getRecommendations
                }
                disabled={
                  recommendLoading
                }
              >

                {recommendLoading
                  ? "Finding Cars..."
                  : "Find Recommended Cars →"}

              </button>


              {recommendError && (

                <div className="error-message">
                  {recommendError}
                </div>

              )}

            </section>


            {/* ==================================================
                RESULTS
                ================================================== */}

            {recommendations.length > 0 && (

              <section className="results-section">

                <div className="results-header">

                  <div>

                    <span className="section-kicker">
                      MATCHED VEHICLES
                    </span>

                    <h2>
                      Recommended Cars
                    </h2>

                    <p>
                      Ranked according to your
                      requirements.
                    </p>

                  </div>

                  <div className="result-count">

                    {recommendations.length}

                    <span>
                      cars found
                    </span>

                  </div>

                </div>


                <div className="results-grid">

                  {recommendations.map(
                    (car, index) => (

                      <article
                        className="car-card"
                        key={`${car.title}-${index}`}
                      >

                        <div className="car-card-top">

                          <div className="car-rank">
                            #{index + 1}
                          </div>

                          <div className="match-score">
                            {Math.round(
                              car.match_score
                            )}
                            % Match
                          </div>

                        </div>


                        <div className="car-card-body">

                          <span className="car-brand">
                            {car.brand}
                          </span>

                          <h3>
                            {car.title}
                          </h3>

                          <div className="car-price">
                            {formatPrice(
                              car.actual_price
                            )}
                          </div>


                          <div className="car-details">

                            <div>
                              <span>
                                Year
                              </span>

                              <strong>
                                {car.year}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Distance
                              </span>

                              <strong>
                                {formatDistance(
                                  car.distance
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Fuel
                              </span>

                              <strong>
                                {car.fuel}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Gearbox
                              </span>

                              <strong>
                                {car.transmission}
                              </strong>
                            </div>

                          </div>


                          <div className="car-card-footer">

                            <span>
                              {car.owner}
                            </span>

                            <button
                              type="button"
                              className="view-link"
                              onClick={() =>
                                setSelectedCar(
                                  car
                                )
                              }
                            >
                              View Car Details →
                            </button>

                          </div>

                        </div>

                      </article>

                    )
                  )}

                </div>

              </section>

            )}

          </>

        )}


        {/* ====================================================
            PRICE PREDICTION TAB
            ==================================================== */}

        {activeTab === "predict" && (

          <section className="prediction-page-card">

            {/* HERO */}

            <div className="prediction-hero">

              <div>

                <span className="prediction-badge">
                  AI PRICE ENGINE
                </span>

                <h2>
                  Car Price Prediction
                </h2>

                <p>
                  Enter vehicle details and get
                  an AI-powered estimated market
                  price.
                </p>

              </div>

              <div className="prediction-icon">
                ₹
              </div>

            </div>


            {/* VEHICLE INFORMATION */}

            <div className="prediction-section">

              <div className="prediction-section-title">

                <div>

                  <h3>
                    Vehicle Information
                  </h3>

                  <p>
                    Select values directly from
                    the available dataset.
                  </p>

                </div>

              </div>


              <div className="prediction-grid">

                {/* BRAND */}

                <div className="prediction-field">

                  <label>
                    Brand
                  </label>

                  <select
                    value={
                      predictionForm.brand
                    }
                    onChange={(e) =>
                      handleBrandChange(
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select Brand
                    </option>

                    {options.brands.map(
                      (brand) => (

                        <option
                          key={brand}
                          value={brand}
                        >
                          {brand}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* MODEL */}

                <div className="prediction-field">

                  <label>
                    Model
                  </label>

                  <select
                    value={
                      predictionForm.model
                    }
                    disabled={
                      !predictionForm.brand
                    }
                    onChange={(e) =>
                      handleModelChange(
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select Model
                    </option>

                    {availableModels.map(
                      (model) => (

                        <option
                          key={model}
                          value={model}
                        >
                          {model}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* VARIANT */}

                <div className="prediction-field">

                  <label>
                    Variant
                  </label>

                  <select
                    value={
                      predictionForm.variant
                    }
                    disabled={
                      !predictionForm.model
                    }
                    onChange={(e) =>
                      handlePredictionChange(
                        "variant",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select Variant
                    </option>

                    {availableVariants.map(
                      (variant) => (

                        <option
                          key={variant}
                          value={variant}
                        >
                          {variant}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* YEAR */}

                <div className="prediction-field">

                  <label>
                    Manufacturing Year
                  </label>

                  <input
                    type="number"
                    min="1990"
                    max="2026"
                    value={
                      predictionForm.year
                    }
                    onChange={(e) =>
                      handlePredictionChange(
                        "year",
                        e.target.value
                      )
                    }
                  />

                </div>


                {/* DISTANCE */}

                <div className="prediction-field">

                  <label>
                    Distance Driven
                  </label>

                  <div className="prediction-input-unit">

                    <input
                      type="number"
                      min="0"
                      value={
                        predictionForm.distance
                      }
                      onChange={(e) =>
                        handlePredictionChange(
                          "distance",
                          e.target.value
                        )
                      }
                    />

                    <span>
                      km
                    </span>

                  </div>

                </div>


                {/* ENGINE */}

                <div className="prediction-field">

                  <label>
                    Engine Capacity
                  </label>

                  <div className="prediction-input-unit">

                    <input
                      type="number"
                      min="500"
                      value={
                        predictionForm.engine_cc
                      }
                      onChange={(e) =>
                        handlePredictionChange(
                          "engine_cc",
                          e.target.value
                        )
                      }
                    />

                    <span>
                      cc
                    </span>

                  </div>

                </div>


                {/* MILEAGE */}

                <div className="prediction-field">

                  <label>
                    Mileage
                  </label>

                  <div className="prediction-input-unit">

                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={
                        predictionForm.mileage
                      }
                      onChange={(e) =>
                        handlePredictionChange(
                          "mileage",
                          e.target.value
                        )
                      }
                    />

                    <span>
                      km/l
                    </span>

                  </div>

                </div>


                {/* SEATS */}

                <div className="prediction-field">

                  <label>
                    Seats
                  </label>

                  <select
                    value={
                      predictionForm.seats
                    }
                    onChange={(e) =>
                      handlePredictionChange(
                        "seats",
                        Number(
                          e.target.value
                        )
                      )
                    }
                  >

                    {options.seats.map(
                      (seat) => (

                        <option
                          key={seat}
                          value={seat}
                        >
                          {seat} Seats
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* FUEL */}

                <div className="prediction-field">

                  <label>
                    Fuel Type
                  </label>

                  <select
                    value={
                      predictionForm.fuel
                    }
                    onChange={(e) =>
                      handlePredictionChange(
                        "fuel",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select Fuel
                    </option>

                    {options.fuels.map(
                      (fuel) => (

                        <option
                          key={fuel}
                          value={fuel}
                        >
                          {fuel}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* TRANSMISSION */}

                <div className="prediction-field">

                  <label>
                    Transmission
                  </label>

                  <select
                    value={
                      predictionForm.transmission
                    }
                    onChange={(e) =>
                      handlePredictionChange(
                        "transmission",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select Transmission
                    </option>

                    {options.transmissions.map(
                      (transmission) => (

                        <option
                          key={transmission}
                          value={transmission}
                        >
                          {transmission}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* OWNER */}

                <div className="prediction-field">

                  <label>
                    Ownership
                  </label>

                  <select
                    value={
                      predictionForm.owner
                    }
                    onChange={(e) =>
                      handlePredictionChange(
                        "owner",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select Owner
                    </option>

                    {options.owners.map(
                      (owner) => (

                        <option
                          key={owner}
                          value={owner}
                        >
                          {owner}
                        </option>

                      )
                    )}

                  </select>

                </div>

              </div>

            </div>


            {/* ERROR */}

            {predictionError && (

              <div className="prediction-error">
                {predictionError}
              </div>

            )}


            {/* PREDICT BUTTON */}

            <button
              className="prediction-submit"
              type="button"
              onClick={predictPrice}
              disabled={
                predictionLoading ||
                !predictionForm.brand ||
                !predictionForm.model ||
                !predictionForm.variant ||
                !predictionForm.fuel ||
                !predictionForm.transmission ||
                !predictionForm.owner
              }
            >

              {predictionLoading
                ? "Predicting Price..."
                : "Predict Car Price →"}

            </button>


            {/* ==================================================
                PREDICTION RESULT
                ================================================== */}

            {predictionResult && (

              <div className="prediction-result-card">

                <div className="prediction-result-label">
                  ESTIMATED MARKET PRICE
                </div>

                <div className="prediction-price">

                  {formatPrice(
                    predictionResult.predicted_price
                  )}

                </div>

                <div className="prediction-meta">

                  <span>
                    AI Model:
                    <strong>
                      {" "}
                      {predictionResult.model_name}
                    </strong>
                  </span>

                  <span>
                    Model R²:
                    <strong>
                      {" "}
                      {(
                        predictionResult.r2_score *
                        100
                      ).toFixed(2)}
                      %
                    </strong>
                  </span>

                </div>


                <div className="prediction-car-summary">

                  <div>

                    <small>
                      Vehicle
                    </small>

                    <strong>
                      {predictionForm.brand}{" "}
                      {predictionForm.model}
                    </strong>

                  </div>


                  <div>

                    <small>
                      Variant
                    </small>

                    <strong>
                      {predictionForm.variant}
                    </strong>

                  </div>


                  <div>

                    <small>
                      Year
                    </small>

                    <strong>
                      {predictionForm.year}
                    </strong>

                  </div>


                  <div>

                    <small>
                      Fuel
                    </small>

                    <strong>
                      {predictionForm.fuel}
                    </strong>

                  </div>

                </div>

              </div>

            )}

          </section>

        )}

      </main>


      {/* ========================================================
          CAR DETAILS MODAL
          ======================================================== */}

      {selectedCar && (

        <div
          className="car-details-overlay"
          onClick={() =>
            setSelectedCar(null)
          }
        >

          <div
            className="car-details-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              type="button"
              className="modal-close"
              onClick={() =>
                setSelectedCar(null)
              }
            >
              ×
            </button>


            <div className="modal-header">

              <span>
                {selectedCar.brand}
              </span>

              <h2>
                {selectedCar.title}
              </h2>

              <div className="modal-price">
                {formatPrice(
                  selectedCar.actual_price
                )}
              </div>

            </div>


            <div className="modal-grid">

              <div className="modal-detail">

                <small>
                  Model
                </small>

                <strong>
                  {selectedCar.model}
                </strong>

              </div>


              <div className="modal-detail">

                <small>
                  Variant
                </small>

                <strong>
                  {selectedCar.variant ||
                    "Standard"}
                </strong>

              </div>


              <div className="modal-detail">

                <small>
                  Year
                </small>

                <strong>
                  {selectedCar.year}
                </strong>

              </div>


              <div className="modal-detail">

                <small>
                  Distance
                </small>

                <strong>
                  {formatDistance(
                    selectedCar.distance
                  )}
                </strong>

              </div>


              <div className="modal-detail">

                <small>
                  Fuel
                </small>

                <strong>
                  {selectedCar.fuel}
                </strong>

              </div>


              <div className="modal-detail">

                <small>
                  Transmission
                </small>

                <strong>
                  {selectedCar.transmission}
                </strong>

              </div>


              <div className="modal-detail">

                <small>
                  Mileage
                </small>

                <strong>
                  {selectedCar.mileage
                    ? `${selectedCar.mileage} km/l`
                    : "N/A"}
                </strong>

              </div>


              <div className="modal-detail">

                <small>
                  Owner
                </small>

                <strong>
                  {selectedCar.owner}
                </strong>

              </div>


              <div className="modal-detail">

                <small>
                  Seats
                </small>

                <strong>
                  {selectedCar.seats || "N/A"}
                </strong>

              </div>


              <div className="modal-detail">

                <small>
                  Match Score
                </small>

                <strong>
                  {Math.round(
                    selectedCar.match_score
                  )}
                  %
                </strong>

              </div>

            </div>


            <div className="modal-note">

              This recommendation is generated
              using the requirements you provided
              and the available vehicle dataset.

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;