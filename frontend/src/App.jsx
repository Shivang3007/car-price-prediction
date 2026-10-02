import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

// ============================================================
// API CONFIGURATION
// ============================================================
// Local:
// http://127.0.0.1:5000
//
// Deployed frontend:
// Set VITE_API_URL in your hosting environment.
// Example:
// VITE_API_URL=https://carvalue-backend-h10i.onrender.com
//
// If VITE_API_URL is not provided, local backend is used.
// ============================================================

const API_URL = "https://carvalue-backend-h10i.onrender.com";

function App() {
  const [activePage, setActivePage] = useState("home");

  // ============================================================
  // DATASET OPTIONS
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
  // COMMON STATE
  // ============================================================

  const [selectedCar, setSelectedCar] = useState(null);
  const [compareCars, setCompareCars] = useState([]);
  const [analysisHistory, setAnalysisHistory] = useState([]);

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
    performance: "Balanced",
    condition: "Used",
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
  // RESALE FORM
  // ============================================================

  const [resaleForm, setResaleForm] = useState({
    currentValue: 800000,
    ownershipYears: 3,
  });

  const [resaleResult, setResaleResult] = useState(null);

  // ============================================================
  // API ERROR HELPER
  // ============================================================

  const getApiErrorMessage = (error, fallback) => {
    if (!error) {
      return fallback;
    }

    if (
      error instanceof TypeError &&
      error.message.toLowerCase().includes("fetch")
    ) {
      return `Backend se connection nahi ho pa raha hai.

Backend URL:
${API_URL}

Check karo ki Flask backend running hai aur URL correct hai.`;
    }

    return error.message || fallback;
  };

  // ============================================================
  // SAFE JSON RESPONSE
  // ============================================================

  const parseResponse = async (response) => {
    const contentType =
      response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return await response.json();
    }

    const text = await response.text();

    throw new Error(
      `Backend ne JSON response nahi diya. HTTP ${response.status}: ${
        text || "Unknown response"
      }`
    );
  };

  // ============================================================
  // LOAD OPTIONS
  // ============================================================

  useEffect(() => {
  let cancelled = false;

  const loadOptions = async () => {
    try {
      setPredictionError("");

      const response = await fetch(
        `${API_URL}/options?t=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await parseResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            `Unable to load dataset options. HTTP ${response.status}`
        );
      }

      if (cancelled) {
        return;
      }

      const loadedOptions = {
        brands: Array.isArray(data.brands)
          ? data.brands
          : [],

        brand_models:
          data.brand_models &&
          typeof data.brand_models === "object"
            ? data.brand_models
            : {},

        model_variants:
          data.model_variants &&
          typeof data.model_variants === "object"
            ? data.model_variants
            : {},

        fuels: Array.isArray(data.fuels)
          ? data.fuels
          : [],

        transmissions: Array.isArray(
          data.transmissions
        )
          ? data.transmissions
          : [],

        owners: Array.isArray(data.owners)
          ? data.owners
          : [],

        seats: Array.isArray(data.seats)
          ? data.seats
          : [],
      };

      setOptions(loadedOptions);

      const firstBrand =
        loadedOptions.brands[0] || "";

      const firstModel =
        loadedOptions.brand_models?.[
          firstBrand
        ]?.[0] || "";

      const firstVariant =
        loadedOptions.model_variants?.[
          `${firstBrand}|||${firstModel}`
        ]?.[0] || "";

      setPredictionForm((prev) => ({
        ...prev,

        brand: firstBrand,

        model: firstModel,

        variant: firstVariant,

        fuel:
          loadedOptions.fuels[0] || "",

        transmission:
          loadedOptions.transmissions[0] ||
          "",

        owner:
          loadedOptions.owners[0] || "",

        seats:
          loadedOptions.seats[0] || 5,
      }));

    } catch (error) {
      console.error(
        "Options loading error:",
        error
      );

      if (!cancelled) {
        setPredictionError(
          getApiErrorMessage(
            error,
            "Backend se dataset options load nahi ho pa rahe hain."
          )
        );
      }

    }
  };

  loadOptions();

  return () => {
    cancelled = true;
  };
}, []);
  // ============================================================
  // DEPENDENT DROPDOWNS
  // ============================================================

  const availableModels = useMemo(() => {
    if (!predictionForm.brand) {
      return [];
    }

    return (
      options.brand_models?.[predictionForm.brand] || []
    );
  }, [options.brand_models, predictionForm.brand]);

  const variantKey =
    predictionForm.brand && predictionForm.model
      ? `${predictionForm.brand}|||${predictionForm.model}`
      : "";

  const availableVariants = useMemo(() => {
    if (!variantKey) {
      return [];
    }

    return options.model_variants?.[variantKey] || [];
  }, [options.model_variants, variantKey]);

  // ============================================================
  // HELPERS
  // ============================================================

  const formatPrice = (price) => {
    if (
      price === null ||
      price === undefined ||
      Number.isNaN(Number(price))
    ) {
      return "₹0";
    }

    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  const formatDistance = (distance) => {
    if (
      distance === null ||
      distance === undefined ||
      distance === ""
    ) {
      return "-";
    }

    return `${Number(distance).toLocaleString("en-IN")} km`;
  };

  const getResaleEstimate = (value, years) => {
    const current = Number(value) || 0;
    const period = Number(years) || 0;

    const annualRate = 0.105;

    const futureValue =
      current * Math.pow(1 - annualRate, period);

    return Math.max(Math.round(futureValue), 0);
  };

  // ============================================================
  // RECOMMENDATION INPUT
  // ============================================================

  const handleRecommendChange = (field, value) => {
    setRecommendForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ============================================================
  // PREDICTION INPUT
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

    const firstModel = models[0] || "";

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
  // FIND CARS
  // ============================================================

  const getRecommendations = async () => {
    try {
      setRecommendLoading(true);
      setRecommendError("");
      setRecommendations([]);

      const response = await fetch(`${API_URL}/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budget:
            recommendForm.budget === ""
              ? 0
              : Number(recommendForm.budget),

          fuel: recommendForm.fuel || null,

          transmission:
            recommendForm.transmission || null,

          mileage:
            recommendForm.mileage === ""
              ? null
              : Number(recommendForm.mileage),

          seats:
            recommendForm.seats === ""
              ? null
              : Number(recommendForm.seats),

          max_distance:
            recommendForm.max_distance === ""
              ? null
              : Number(recommendForm.max_distance),

          max_age:
            recommendForm.max_age === ""
              ? null
              : Number(recommendForm.max_age),
        }),
      });

      const data = await parseResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            `Unable to get recommendations. HTTP ${response.status}`
        );
      }

      setRecommendations(data.results || []);
      setActivePage("find");
    } catch (error) {
      console.error("Recommendation error:", error);

      setRecommendError(
        getApiErrorMessage(
          error,
          "Something went wrong while getting recommendations."
        )
      );
    } finally {
      setRecommendLoading(false);
    }
  };

  // ============================================================
  // PRICE PREDICTION
  // ============================================================

  const predictPrice = async () => {
    try {
      setPredictionLoading(true);
      setPredictionError("");
      setPredictionResult(null);

      if (!predictionForm.brand) {
        throw new Error("Please select a brand.");
      }

      if (!predictionForm.model) {
        throw new Error("Please select a model.");
      }

      if (!predictionForm.variant) {
        throw new Error("Please select a variant.");
      }

      if (!predictionForm.fuel) {
        throw new Error("Please select fuel type.");
      }

      if (!predictionForm.transmission) {
        throw new Error("Please select transmission.");
      }

      if (!predictionForm.owner) {
        throw new Error("Please select ownership.");
      }

      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand: predictionForm.brand,
          model: predictionForm.model,
          variant: predictionForm.variant,
          year: Number(predictionForm.year),
          distance: Number(predictionForm.distance),
          engine_cc: Number(predictionForm.engine_cc),

          mileage:
            predictionForm.mileage === ""
              ? null
              : Number(predictionForm.mileage),

          seats: Number(predictionForm.seats),
          fuel: predictionForm.fuel,
          transmission: predictionForm.transmission,
          owner: predictionForm.owner,
        }),
      });

      const data = await parseResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            `Price prediction failed. HTTP ${response.status}`
        );
      }

      setPredictionResult(data);

      setAnalysisHistory((prev) => [
        {
          id: Date.now(),
          title: `${predictionForm.brand} ${predictionForm.model}`,
          variant: predictionForm.variant,
          predictedPrice: data.predicted_price,
          date: new Date().toLocaleDateString("en-IN"),
        },
        ...prev,
      ].slice(0, 8));

      setActivePage("dashboard");
    } catch (error) {
      console.error("Prediction error:", error);

      setPredictionError(
        getApiErrorMessage(
          error,
          "Unable to predict price."
        )
      );
    } finally {
      setPredictionLoading(false);
    }
  };

  // ============================================================
  // RESALE
  // ============================================================

  const calculateResale = () => {
    const current = Number(resaleForm.currentValue);

    if (!current || current <= 0) {
      return;
    }

    const future = getResaleEstimate(
      resaleForm.currentValue,
      resaleForm.ownershipYears
    );

    setResaleResult({
      currentValue: current,
      futureValue: future,
      years: Number(resaleForm.ownershipYears),
      depreciation: Math.round(
        ((current - future) / current) * 100
      ),
    });
  };

  // ============================================================
  // COMPARE
  // ============================================================

  const toggleCompare = (car) => {
    const exists = compareCars.some(
      (item) =>
        item.title === car.title &&
        item.year === car.year &&
        item.actual_price === car.actual_price
    );

    if (exists) {
      setCompareCars((prev) =>
        prev.filter(
          (item) =>
            !(
              item.title === car.title &&
              item.year === car.year &&
              item.actual_price === car.actual_price
            )
        )
      );

      return;
    }

    if (compareCars.length >= 3) {
      alert(
        "You can compare maximum 3 cars at a time."
      );
      return;
    }

    setCompareCars((prev) => [...prev, car]);
  };

  // ============================================================
  // QUICK NAVIGATION
  // ============================================================

  const openPrediction = () => {
    setActivePage("predict");
  };

  const openFindCar = () => {
    setActivePage("find");
  };

  // ============================================================
  // FAIR PRICE
  // ============================================================

  const fairPrice = predictionResult
    ? Number(predictionResult.predicted_price)
    : null;

  const selectedListingPrice =
    selectedCar?.actual_price || null;

  const fairPriceDifference =
    fairPrice && selectedListingPrice
      ? selectedListingPrice - fairPrice
      : null;

  const fairPriceStatus =
    fairPriceDifference === null
      ? "Waiting for vehicle data"
      : fairPriceDifference <= 0
      ? "Potentially below estimated value"
      : fairPriceDifference <= fairPrice * 0.08
      ? "Close to estimated market value"
      : "Potentially above estimated value";

  // Prevent unused-variable warnings while preserving
  // fair-price calculation for future UI use.
  void fairPriceStatus;

  // ============================================================
  // PAGE CONTENT
  // ============================================================

  return (
    <div className="app">

      {/* ======================================================
          NAVBAR
          ====================================================== */}

      <nav className="top-nav">

        <button
          className="brand-logo"
          type="button"
          onClick={() => setActivePage("home")}
        >
          <span className="brand-mark">
            C
          </span>

          <span>
            <strong>CarValue</strong>
            <small>AI</small>
          </span>
        </button>

        <div className="nav-links">

          <button
            className={
              activePage === "home"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("home")
            }
          >
            Home
          </button>

          <button
            className={
              activePage === "dashboard"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("dashboard")
            }
          >
            Dashboard
          </button>

          <button
            className={
              activePage === "find"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("find")
            }
          >
            Find My Car
          </button>

          <button
            className={
              activePage === "compare"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("compare")
            }
          >
            Compare
          </button>

          <button
            className={
              activePage === "resale"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("resale")
            }
          >
            Resale
          </button>

        </div>

      </nav>

      {/* ======================================================
          HOME
          ====================================================== */}

      {activePage === "home" && (

        <main>

          <section className="home-hero">

            <div className="hero-glow hero-glow-one" />
            <div className="hero-glow hero-glow-two" />

            <div className="home-hero-content">

              <div className="hero-ai-badge">
                ✦ AI-POWERED CAR INTELLIGENCE
              </div>

              <h1>
                Know Your Car.
                <br />
                <span>
                  Know Its Value.
                </span>
              </h1>

              <p>
                CarValue AI combines machine
                learning, smart recommendations
                and automotive intelligence to help
                you make better car decisions.
              </p>

              <div className="hero-actions">

                <button
                  className="hero-secondary"
                  onClick={openPrediction}
                >
                  ₹ Predict Car Price
                </button>

              </div>

              <div className="hero-stats">

                <div>
                  <strong>87%</strong>
                  <span>Model R²</span>
                </div>

                <div>
                  <strong>1,868+</strong>
                  <span>Cars Dataset</span>
                </div>

                <div>
                  <strong>AI</strong>
                  <span>Smart Insights</span>
                </div>

              </div>

            </div>

            <div className="hero-car-visual">

              <div className="visual-ring ring-one" />
              <div className="visual-ring ring-two" />

              <div className="car-visual-card">

                <div className="car-visual-top">
                  <span>
                    AI VALUATION
                  </span>

                  <span>
                    ● LIVE
                  </span>
                </div>

                <div className="car-visual-car">
                  🚘
                </div>

                <div className="visual-price">
                  ₹8.45 L
                </div>

                <div className="visual-caption">
                  Estimated Market Value
                </div>

                <div className="visual-tags">
                  <span>
                    AI Model
                  </span>

                  <span>
                    Used Car
                  </span>

                  <span>
                    Smart Valuation
                  </span>
                </div>

              </div>

            </div>

          </section>

          <section className="feature-section">

            <div className="section-heading-center">

              <span>
                CAR INTELLIGENCE
              </span>

              <h2>
                Everything you need to understand
                a car
              </h2>

              <p>
                One platform for valuation,
                discovery, comparison and resale.
              </p>

            </div>

            <div className="feature-grid">

              <button
                className="feature-card feature-main"
                onClick={openPrediction}
              >
                <span className="feature-icon">
                  ₹
                </span>

                <span className="feature-label">
                  PRICE ENGINE
                </span>

                <h3>
                  Predict Car Price
                </h3>

                <p>
                  Get an ML-powered estimated
                  market price from vehicle details.
                </p>

                <strong>
                  Start valuation →
                </strong>
              </button>

              <button
                className="feature-card"
                onClick={openFindCar}
              >
                <span className="feature-icon">
                  🎯
                </span>

                <span className="feature-label">
                  SMART SEARCH
                </span>

                <h3>
                  Find My Best Car
                </h3>

                <p>
                  Discover cars based on your
                  budget and lifestyle.
                </p>

                <strong>
                  Find cars →
                </strong>
              </button>

              <button
                className="feature-card"
                onClick={() =>
                  setActivePage("compare")
                }
              >
                <span className="feature-icon">
                  ⚖️
                </span>

                <span className="feature-label">
                  DECISION ENGINE
                </span>

                <h3>
                  Compare Cars
                </h3>

                <p>
                  Compare prices, specifications,
                  mileage and more.
                </p>

                <strong>
                  Compare →
                </strong>
              </button>

              <button
                className="feature-card"
                onClick={() =>
                  setActivePage("resale")
                }
              >
                <span className="feature-icon">
                  🔮
                </span>

                <span className="feature-label">
                  FUTURE VALUE
                </span>

                <h3>
                  Future Resale
                </h3>

                <p>
                  Estimate how your car value may
                  change over time.
                </p>

                <strong>
                  Explore resale →
                </strong>
              </button>

              <button
                className="feature-card"
                onClick={() =>
                  setActivePage("dashboard")
                }
              >
                <span className="feature-icon">
                  📊
                </span>

                <span className="feature-label">
                  MY GARAGE
                </span>

                <h3>
                  My Dashboard
                </h3>

                <p>
                  View your analyses, predictions
                  and comparison activity.
                </p>

                <strong>
                  Open dashboard →
                </strong>
              </button>

            </div>

          </section>

        </main>

      )}

      {/* ======================================================
          DASHBOARD
          ====================================================== */}

      {activePage === "dashboard" && (

        <main className="page-container">

          <div className="page-heading">

            <div>
              <span>
                MY GARAGE
              </span>

              <h1>
                CarValue Dashboard
              </h1>

              <p>
                Your car analysis and valuation
                workspace.
              </p>
            </div>

            <button
              className="dark-action"
              onClick={openPrediction}
            >
              + New Analysis
            </button>

          </div>

          <div className="dashboard-stats">

            <div className="dashboard-stat">
              <span>
                SELECTED CAR
              </span>

              <strong>
                {predictionForm.brand
                  ? `${predictionForm.brand} ${predictionForm.model}`
                  : "No car yet"}
              </strong>

              <small>
                {predictionForm.variant ||
                  "Start an analysis"}
              </small>
            </div>

            <div className="dashboard-stat">
              <span>
                PREDICTED PRICE
              </span>

              <strong>
                {predictionResult
                  ? formatPrice(
                      predictionResult.predicted_price
                    )
                  : "—"}
              </strong>

              <small>
                ML estimated value
              </small>
            </div>

            <div className="dashboard-stat">
              <span>
                FUTURE RESALE
              </span>

              <strong>
                {resaleResult
                  ? formatPrice(
                      resaleResult.futureValue
                    )
                  : "—"}
              </strong>

              <small>
                Estimated future value
              </small>
            </div>

            <div className="dashboard-stat">
              <span>
                COMPARE LIST
              </span>

              <strong>
                {compareCars.length}
              </strong>

              <small>
                Cars selected
              </small>
            </div>

          </div>

          <div className="dashboard-layout">

            <section className="dashboard-main-card">

              <div className="card-heading">

                <div>
                  <span>
                    MY CAR ANALYSIS
                  </span>

                  <h2>
                    {predictionForm.brand
                      ? `${predictionForm.brand} ${predictionForm.model}`
                      : "No analysis yet"}
                  </h2>
                </div>

                <div className="status-pill">
                  ● AI READY
                </div>

              </div>

              {predictionResult ? (

                <div className="analysis-result">

                  <div className="big-price">

                    {formatPrice(
                      predictionResult.predicted_price
                    )}

                    <small>
                      Estimated Market Price
                    </small>

                  </div>

                  <div className="analysis-grid">

                    <div>
                      <span>
                        Model Accuracy
                      </span>

                      <strong>
                        {(
                          predictionResult.r2_score *
                          100
                        ).toFixed(1)}
                        %
                      </strong>
                    </div>

                    <div>
                      <span>
                        Year
                      </span>

                      <strong>
                        {predictionForm.year}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Distance
                      </span>

                      <strong>
                        {formatDistance(
                          predictionForm.distance
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Fuel
                      </span>

                      <strong>
                        {predictionForm.fuel}
                      </strong>
                    </div>

                  </div>

                </div>

              ) : (

                <div className="empty-analysis">

                  <div>
                    🚘
                  </div>

                  <h3>
                    Your car analysis will appear here
                  </h3>

                  <p>
                    Predict a car price to create
                    your first analysis.
                  </p>

                  <button
                    className="dark-action"
                    onClick={openPrediction}
                  >
                    Predict My Car
                  </button>

                </div>

              )}

            </section>

          </div>

          <section className="history-card">

            <div className="card-heading">

              <div>
                <span>
                  ACTIVITY
                </span>

                <h2>
                  Recent Analyses
                </h2>
              </div>

            </div>

            {analysisHistory.length === 0 ? (

              <div className="history-empty">
                No analysis history yet.
              </div>

            ) : (

              <div className="history-list">

                {analysisHistory.map((item) => (

                  <div
                    className="history-item"
                    key={item.id}
                  >

                    <div className="history-car-icon">
                      🚘
                    </div>

                    <div>

                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {item.variant} •{" "}
                        {item.date}
                      </span>

                    </div>

                    <strong className="history-price">
                      {formatPrice(
                        item.predictedPrice
                      )}
                    </strong>

                  </div>

                ))}

              </div>

            )}

          </section>

        </main>

      )}

      {/* ======================================================
          FIND MY CAR
          ====================================================== */}

      {activePage === "find" && (

        <main className="page-container">

          <div className="page-heading">

            <div>
              <span>
                SMART CAR SELECTION
              </span>

              <h1>
                Find My Best Car
              </h1>

              <p>
                Tell us what you need and discover
                matching vehicles.
              </p>
            </div>

          </div>

          <section className="smart-search-card">

            <div className="smart-search-header">

              <div className="smart-search-icon">
                🎯
              </div>

              <div>

                <h2>
                  Build your perfect car profile
                </h2>

                <p>
                  The recommendation engine will
                  rank cars based on your preferences.
                </p>

              </div>

            </div>

            <div className="smart-form-grid">

              <div className="field">

                <label>
                  Maximum Budget
                </label>

                <div className="input-with-prefix">

                  <span>
                    ₹
                  </span>

                  <input
                    type="number"
                    value={recommendForm.budget}
                    onChange={(e) =>
                      handleRecommendChange(
                        "budget",
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>

              <div className="field">

                <label>
                  Fuel Preference
                </label>

                <select
                  value={recommendForm.fuel}
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

                  {options.fuels.map((fuel) => (

                    <option
                      key={fuel}
                      value={fuel}
                    >
                      {fuel}
                    </option>

                  ))}

                </select>

              </div>

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

              <div className="field">

                <label>
                  Maximum Kilometers
                </label>

                <div className="input-with-suffix">

                  <input
                    type="number"
                    value={
                      recommendForm.max_distance
                    }
                    onChange={(e) =>
                      handleRecommendChange(
                        "max_distance",
                        e.target.value
                      )
                    }
                    placeholder="50000"
                  />

                  <span>
                    km
                  </span>

                </div>

              </div>

              <div className="field">

                <label>
                  Minimum Mileage
                </label>

                <div className="input-with-suffix">

                  <input
                    type="number"
                    value={
                      recommendForm.mileage
                    }
                    onChange={(e) =>
                      handleRecommendChange(
                        "mileage",
                        e.target.value
                      )
                    }
                    placeholder="15"
                  />

                  <span>
                    km/l
                  </span>

                </div>

              </div>

              <div className="field">

                <label>
                  Family Size
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
                    Any Family Size
                  </option>

                  {options.seats.map((seat) => (

                    <option
                      key={seat}
                      value={seat}
                    >
                      {seat} seats
                    </option>

                  ))}

                </select>

              </div>

              <div className="field">

                <label>
                  Performance Preference
                </label>

                <select
                  value={
                    recommendForm.performance
                  }
                  onChange={(e) =>
                    handleRecommendChange(
                      "performance",
                      e.target.value
                    )
                  }
                >

                  <option>
                    Balanced
                  </option>

                  <option>
                    Economy
                  </option>

                  <option>
                    Performance
                  </option>

                  <option>
                    Premium
                  </option>

                </select>

              </div>

              <div className="field">

                <label>
                  Car Condition
                </label>

                <select
                  value={
                    recommendForm.condition
                  }
                  onChange={(e) =>
                    handleRecommendChange(
                      "condition",
                      e.target.value
                    )
                  }
                >

                  <option>
                    Used
                  </option>

                  <option>
                    New
                  </option>

                  <option>
                    Either
                  </option>

                </select>

              </div>

              <div className="field">

                <label>
                  Maximum Car Age
                </label>

                <div className="input-with-suffix">

                  <input
                    type="number"
                    value={
                      recommendForm.max_age
                    }
                    onChange={(e) =>
                      handleRecommendChange(
                        "max_age",
                        e.target.value
                      )
                    }
                    placeholder="5"
                  />

                  <span>
                    years
                  </span>

                </div>

              </div>

            </div>

            <button
              className="large-gradient-btn"
              onClick={getRecommendations}
              disabled={recommendLoading}
            >

              {recommendLoading
                ? "Finding Your Cars..."
                : "🎯 Find My Best Cars"}

            </button>

            {recommendError && (

              <div className="error-message">
                {recommendError}
              </div>

            )}

          </section>

          {recommendations.length > 0 && (

            <section className="recommend-results">

              <div className="results-heading-new">

                <div>

                  <span>
                    MATCHED VEHICLES
                  </span>

                  <h2>
                    Cars selected for you
                  </h2>

                </div>

                <div className="result-count-new">
                  {recommendations.length} matches
                </div>

              </div>

              <div className="new-car-grid">

                {recommendations.map(
                  (car, index) => {

                    const isCompared =
                      compareCars.some(
                        (item) =>
                          item.title ===
                            car.title &&
                          item.year ===
                            car.year &&
                          item.actual_price ===
                            car.actual_price
                      );

                    return (

                      <article
                        className="new-car-card"
                        key={`${car.title}-${index}`}
                      >

                        <div className="car-image-area">

                          <div className="car-image-placeholder">
                            🚘
                          </div>

                          <span className="car-number">
                            #{index + 1}
                          </span>

                          <span className="car-match">

                            {Math.round(
                              car.match_score
                            )}

                            % MATCH

                          </span>

                        </div>

                        <div className="new-car-body">

                          <span className="new-car-brand">
                            {car.brand}
                          </span>

                          <h3>
                            {car.title}
                          </h3>

                          <div className="new-car-price">
                            {formatPrice(
                              car.actual_price
                            )}
                          </div>

                          <div className="new-car-specs">

                            <span>
                              📅 {car.year}
                            </span>

                            <span>
                              🛣️{" "}
                              {formatDistance(
                                car.distance
                              )}
                            </span>

                            <span>
                              ⛽ {car.fuel}
                            </span>

                            <span>
                              ⚙️{" "}
                              {car.transmission}
                            </span>

                          </div>

                          <div className="new-car-actions">

                            <button
                              onClick={() =>
                                setSelectedCar(car)
                              }
                            >
                              View Details
                            </button>

                            <button
                              className={
                                isCompared
                                  ? "compare-active"
                                  : ""
                              }
                              onClick={() =>
                                toggleCompare(car)
                              }
                            >

                              {isCompared
                                ? "✓ Compared"
                                : "⚖ Compare"}

                            </button>

                          </div>

                        </div>

                      </article>

                    );
                  }
                )}

              </div>

            </section>

          )}

        </main>

      )}

      {/* ======================================================
          PRICE PREDICTION
          ====================================================== */}

      {activePage === "predict" && (

        <main className="page-container">

          <div className="page-heading">

            <div>

              <span>
                AI PRICE ENGINE
              </span>

              <h1>
                Predict Car Price
              </h1>

              <p>
                Estimate the market value of a used
                car using the trained ML model.
              </p>

            </div>

          </div>

          <section className="prediction-modern-card">

            <div className="prediction-modern-header">

              <div>

                <span>
                  ML VALUATION ENGINE
                </span>

                <h2>
                  Tell us about your car
                </h2>

                <p>
                  Select the vehicle and enter its
                  current condition.
                </p>

              </div>

              <div className="prediction-big-icon">
                ₹
              </div>

            </div>

            <div className="prediction-modern-body">

              <div className="modern-form-grid">

                <div className="field">

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

                <div className="field">

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

                <div className="field">

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

                <div className="field">

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

                <div className="field">

                  <label>
                    Distance Driven
                  </label>

                  <div className="input-with-suffix">

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

                <div className="field">

                  <label>
                    Engine Capacity
                  </label>

                  <div className="input-with-suffix">

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

                <div className="field">

                  <label>
                    Mileage
                  </label>

                  <div className="input-with-suffix">

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

                <div className="field">

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
                        Number(e.target.value)
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

                <div className="field">

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

                <div className="field">

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

                <div className="field">

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

              {predictionError && (

                <div className="prediction-error">
                  {predictionError}
                </div>

              )}

              <button
                className="large-gradient-btn"
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
                  ? "⏳ AI is calculating..."
                  : "₹ Predict My Car Price"}

              </button>

            </div>

            {predictionResult && (

              <div className="prediction-success">

                <div>

                  <span>
                    ESTIMATED MARKET PRICE
                  </span>

                  <strong>
                    {formatPrice(
                      predictionResult.predicted_price
                    )}
                  </strong>

                  <p>
                    Estimated using the trained
                    CarValue AI machine-learning
                    model.
                  </p>

                </div>

                <div className="prediction-confidence">

                  <span>
                    MODEL R²
                  </span>

                  <strong>
                    {(
                      predictionResult.r2_score *
                      100
                    ).toFixed(2)}
                    %
                  </strong>

                  <small>
                    Validation performance
                  </small>

                </div>

                <div className="prediction-result-actions">

                  <button
                    onClick={() => {

                      setResaleForm({
                        currentValue:
                          Math.round(
                            predictionResult.predicted_price
                          ),
                        ownershipYears: 3,
                      });

                      setActivePage("resale");

                    }}
                  >
                    🔮 Estimate Resale
                  </button>

                  <button
                    onClick={() =>
                      setActivePage(
                        "dashboard"
                      )
                    }
                  >
                    📊 View Dashboard
                  </button>

                </div>

              </div>

            )}

          </section>

        </main>

      )}

      {/* ======================================================
          COMPARE
          ====================================================== */}

      {activePage === "compare" && (

        <main className="page-container">

          <div className="page-heading">

            <div>

              <span>
                DECISION ENGINE
              </span>

              <h1>
                Compare Cars
              </h1>

              <p>
                Compare up to three shortlisted
                vehicles side by side.
              </p>

            </div>

            <button
              className="dark-action"
              onClick={openFindCar}
            >
              + Find Cars
            </button>

          </div>

          {compareCars.length === 0 ? (

            <section className="empty-feature-card">

              <div>
                ⚖️
              </div>

              <h2>
                Your comparison is empty
              </h2>

              <p>
                Go to Find My Car and select
                vehicles using the Compare button.
              </p>

              <button
                className="large-gradient-btn small-btn"
                onClick={openFindCar}
              >
                Find Cars to Compare
              </button>

            </section>

          ) : (

            <section className="compare-card">

              <div className="compare-header">

                <span>
                  {compareCars.length}/3 SELECTED
                </span>

                <button
                  onClick={() =>
                    setCompareCars([])
                  }
                >
                  Clear All
                </button>

              </div>

              <div className="compare-grid">

                {compareCars.map(
                  (car, index) => (

                    <div
                      className="compare-column"
                      key={`${car.title}-${index}`}
                    >

                      <div className="compare-car-visual">
                        🚘
                      </div>

                      <span>
                        {car.brand}
                      </span>

                      <h3>
                        {car.title}
                      </h3>

                      <strong className="compare-price">
                        {formatPrice(
                          car.actual_price
                        )}
                      </strong>

                      <button
                        className="remove-compare"
                        onClick={() =>
                          toggleCompare(car)
                        }
                      >
                        Remove
                      </button>

                    </div>

                  )
                )}

              </div>

              <div className="comparison-table">

                <div className="comparison-row comparison-label-row">

                  <span>
                    Specification
                  </span>

                  {compareCars.map(
                    (car, index) => (

                      <strong key={index}>
                        Car {index + 1}
                      </strong>

                    )
                  )}

                </div>

                {[
                  ["Year", "year"],
                  ["Mileage", "mileage"],
                  ["Fuel", "fuel"],
                  [
                    "Transmission",
                    "transmission",
                  ],
                  ["Distance", "distance"],
                  ["Seats", "seats"],
                  ["Owner", "owner"],
                ].map(
                  ([label, key]) => (

                    <div
                      className="comparison-row"
                      key={key}
                    >

                      <span>
                        {label}
                      </span>

                      {compareCars.map(
                        (car, index) => (

                          <strong key={index}>

                            {key === "distance"
                              ? formatDistance(
                                  car[key]
                                )
                              : key === "mileage"
                              ? car[key]
                                ? `${car[key]} km/l`
                                : "N/A"
                              : car[key] ||
                                "N/A"}

                          </strong>

                        )
                      )}

                    </div>

                  )
                )}

                <div className="comparison-row">

                  <span>
                    Estimated Resale
                  </span>

                  {compareCars.map(
                    (car, index) => (

                      <strong key={index}>

                        {formatPrice(
                          getResaleEstimate(
                            car.actual_price,
                            3
                          )
                        )}

                      </strong>

                    )
                  )}

                </div>

              </div>

            </section>

          )}

        </main>

      )}

      {/* ======================================================
          RESALE
          ====================================================== */}

      {activePage === "resale" && (

        <main className="page-container">

          <div className="page-heading">

            <div>

              <span>
                FUTURE VALUE ENGINE
              </span>

              <h1>
                Future Resale Predictor
              </h1>

              <p>
                Estimate how your car's value may
                change over your ownership period.
              </p>

            </div>

          </div>

          <section className="resale-layout">

            <div className="resale-form-card">

              <div className="resale-icon">
                🔮
              </div>

              <h2>
                Estimate your future car value
              </h2>

              <p>
                Enter the current estimated value
                and expected ownership period.
              </p>

              <div className="field">

                <label>
                  Current Estimated Value
                </label>

                <div className="input-with-prefix">

                  <span>
                    ₹
                  </span>

                  <input
                    type="number"
                    value={
                      resaleForm.currentValue
                    }
                    onChange={(e) =>
                      setResaleForm(
                        (prev) => ({
                          ...prev,
                          currentValue:
                            e.target.value,
                        })
                      )
                    }
                  />

                </div>

              </div>

              <div className="field">

                <label>
                  Expected Ownership Period
                </label>

                <select
                  value={
                    resaleForm.ownershipYears
                  }
                  onChange={(e) =>
                    setResaleForm(
                      (prev) => ({
                        ...prev,
                        ownershipYears:
                          Number(
                            e.target.value
                          ),
                      })
                    )
                  }
                >

                  <option value={1}>
                    1 Year
                  </option>

                  <option value={2}>
                    2 Years
                  </option>

                  <option value={3}>
                    3 Years
                  </option>

                  <option value={4}>
                    4 Years
                  </option>

                  <option value={5}>
                    5 Years
                  </option>

                  <option value={7}>
                    7 Years
                  </option>

                </select>

              </div>

              <button
                className="large-gradient-btn"
                onClick={calculateResale}
              >
                🔮 Estimate Future Value
              </button>

            </div>

            <div className="resale-result-card">

              {!resaleResult ? (

                <div className="resale-empty">

                  <div>
                    📈
                  </div>

                  <h3>
                    Your resale projection
                  </h3>

                  <p>
                    Enter your car's current value
                    to see an estimated future value.
                  </p>

                </div>

              ) : (

                <>

                  <div className="resale-result-header">

                    <span>
                      ESTIMATED FUTURE VALUE
                    </span>

                    <strong>
                      {formatPrice(
                        resaleResult.futureValue
                      )}
                    </strong>

                    <p>
                      After{" "}
                      {resaleResult.years} years
                    </p>

                  </div>

                  <div className="resale-chart">

                    <div className="chart-line">

                      <div className="chart-point point-start">

                        <span>
                          {formatPrice(
                            resaleResult.currentValue
                          )}
                        </span>

                      </div>

                      <div className="chart-point point-mid">

                        <span>
                          {formatPrice(
                            Math.round(
                              resaleResult.currentValue *
                                0.895
                            )
                          )}
                        </span>

                      </div>

                      <div className="chart-point point-end">

                        <span>
                          {formatPrice(
                            resaleResult.futureValue
                          )}
                        </span>

                      </div>

                    </div>

                    <div className="chart-years">

                      <span>
                        Today
                      </span>

                      <span>
                        Mid ownership
                      </span>

                      <span>
                        Year{" "}
                        {resaleResult.years}
                      </span>

                    </div>

                  </div>

                  <div className="resale-metrics">

                    <div>

                      <span>
                        Current Value
                      </span>

                      <strong>
                        {formatPrice(
                          resaleResult.currentValue
                        )}
                      </strong>

                    </div>

                    <div>

                      <span>
                        Estimated Depreciation
                      </span>

                      <strong>
                        {resaleResult.depreciation}%
                      </strong>

                    </div>

                    <div>

                      <span>
                        Future Value
                      </span>

                      <strong>
                        {formatPrice(
                          resaleResult.futureValue
                        )}
                      </strong>

                    </div>

                  </div>

                  <div className="estimate-disclaimer">

                    ⚠ This is an estimated projection,
                    not a guaranteed future market price.
                    Actual resale value may vary based on
                    condition, mileage, market demand,
                    location and other factors.

                  </div>

                </>

              )}

            </div>

          </section>

        </main>

      )}

      {/* ======================================================
          CAR DETAILS MODAL
          ====================================================== */}

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

            <div className="modal-car-visual">
              🚘
            </div>

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
                  {selectedCar.seats ||
                    "N/A"}
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

            <div className="modal-actions">

              <button
                className="modal-compare-btn"
                onClick={() =>
                  toggleCompare(selectedCar)
                }
              >
                ⚖ Add to Compare
              </button>

              <button
                className="modal-close-btn"
                onClick={() =>
                  setSelectedCar(null)
                }
              >
                Close
              </button>

            </div>

            <div className="modal-note">

              This recommendation is generated
              using your requirements and the
              available vehicle dataset.

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;