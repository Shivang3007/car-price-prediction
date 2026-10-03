from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import re
import os


# ============================================================
# APP CONFIGURATION
# ============================================================

app = Flask(__name__)

# Allow deployed frontend + other browsers/devices
CORS(
    app,
    resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    }
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "car_price_prediction_model.joblib"
)

DATA_PATH = os.path.join(
    BASE_DIR,
    "car_price_prediction_clean.csv"
)


# ============================================================
# LOAD MODEL + DATA
# ============================================================

print("Loading model...")
model = joblib.load(MODEL_PATH)

print("Loading dataset...")
cars_df = pd.read_csv(DATA_PATH)

REFERENCE_YEAR = 2026


# ============================================================
# BASIC CLEANING
# ============================================================

cars_df = cars_df.copy()

cars_df = cars_df[
    cars_df["price"] >= 100000
]

cars_df = cars_df[
    cars_df["distance"] <= 200000
]

cars_df.loc[
    cars_df["mileage"] > 40,
    "mileage"
] = np.nan

cars_df.loc[
    cars_df["engine_cc"] < 500,
    "engine_cc"
] = np.nan


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_flag(text, pattern):
    return int(
        bool(
            re.search(
                pattern,
                str(text),
                flags=re.IGNORECASE
            )
        )
    )


def owner_to_number(owner):
    owner_map = {
        "0th Owner": 0,
        "1st Owner": 1,
        "2nd Owner": 2,
        "3rd Owner": 3,
        "4th Owner": 4
    }

    return owner_map.get(
        str(owner),
        np.nan
    )


def extract_brand_model(title):

    parts = str(title).split()

    if parts and parts[0].isdigit():
        parts = parts[1:]

    if (
        len(parts) >= 2
        and parts[0] == "Mercedes-Benz"
    ):
        brand = "Mercedes-Benz"
        model = parts[1]

    elif (
        len(parts) >= 2
        and parts[0] == "Land"
        and parts[1] == "Rover"
    ):
        brand = "Land Rover"
        model = (
            parts[2]
            if len(parts) > 2
            else "Unknown"
        )

    elif (
        len(parts) >= 2
        and parts[0] == "Maruti"
        and parts[1] == "Suzuki"
    ):
        brand = "Maruti Suzuki"
        model = (
            parts[2]
            if len(parts) > 2
            else "Unknown"
        )

    elif (
        len(parts) >= 2
        and parts[0] == "MG"
    ):
        brand = "MG"
        model = parts[1]

    else:
        brand = (
            parts[0]
            if parts
            else "Unknown"
        )

        model = (
            parts[1]
            if len(parts) > 1
            else "Unknown"
        )

    return pd.Series([
        brand,
        model
    ])


def fix_model_name(row):

    title = str(row["title"])

    if "Range Rover Evoque" in title:
        return "Range Rover Evoque"

    if "Range Rover Velar" in title:
        return "Range Rover Velar"

    if "Range Rover" in title:
        return "Range Rover"

    if "Grand i10" in title:
        return "Grand i10"

    if "Grand Vitara" in title:
        return "Grand Vitara"

    if "Innova Crysta" in title:
        return "Innova Crysta"

    if "Vitara Brezza" in title:
        return "Vitara Brezza"

    if "Urban cruiser" in title:
        return "Urban Cruiser"

    return row["model"]


def extract_variant(row):

    title = str(row["title"])
    year = str(row["year"])
    brand = str(row["brand"])
    model_name = str(row["model"])

    title = title.replace(
        year,
        "",
        1
    ).strip()

    title = title.replace(
        brand,
        "",
        1
    ).strip()

    title = title.replace(
        model_name,
        "",
        1
    ).strip()

    variant = " ".join(
        title.split()
    )

    return (
        variant
        if variant
        else "Standard"
    )


# ============================================================
# PREPARE DATASET
# ============================================================

brand_model_data = cars_df[
    "title"
].apply(
    extract_brand_model
)

cars_df["brand"] = brand_model_data[0]
cars_df["model"] = brand_model_data[1]

cars_df["model"] = cars_df.apply(
    fix_model_name,
    axis=1
)

cars_df["variant"] = cars_df.apply(
    extract_variant,
    axis=1
)


# ============================================================
# FEATURE ENGINEERING
# ============================================================

cars_df["car_age"] = (
    REFERENCE_YEAR -
    cars_df["year"]
)

cars_df["engine_liters"] = (
    cars_df["engine_cc"] / 1000
)

cars_df["km_per_year"] = (
    cars_df["distance"] /
    cars_df["car_age"].clip(
        lower=1
    )
)

cars_df["is_automatic"] = (
    cars_df["transmission"]
    .astype(str)
    .str.lower()
    .str.contains(
        "automatic"
    )
    .astype(int)
)

cars_df["is_ev"] = (
    cars_df["title"]
    .astype(str)
    .str.contains(
        r"\bEV\b|Electric",
        case=False,
        regex=True
    )
    .astype(int)
)

title_text = cars_df[
    "title"
].astype(str)

cars_df["has_turbo"] = (
    title_text.str.contains(
        r"\bTurbo\b|\bT-GDI\b|\bTSI\b|\bTFSI\b|\bi-Turbo\b",
        case=False,
        regex=True
    )
    .astype(int)
)

cars_df["has_sunroof"] = (
    title_text.str.contains(
        r"Sunroof|Moonroof",
        case=False,
        regex=True
    )
    .astype(int)
)

cars_df["has_awd_4wd"] = (
    title_text.str.contains(
        r"\bAWD\b|\b4WD\b|\b4X4\b",
        case=False,
        regex=True
    )
    .astype(int)
)

cars_df["has_dct_cvt"] = (
    title_text.str.contains(
        r"\bDCT\b|\bCVT\b",
        case=False,
        regex=True
    )
    .astype(int)
)

cars_df["has_sport"] = (
    title_text.str.contains(
        r"\bSport\b|\bAMG\b|\bM\b|\bRS\b|\bGT\b",
        case=False,
        regex=True
    )
    .astype(int)
)

cars_df["has_luxury_trim"] = (
    title_text.str.contains(
        r"Luxury|Premium|Ultimate|Signature|Exclusive|Top",
        case=False,
        regex=True
    )
    .astype(int)
)

cars_df["owner_number"] = (
    cars_df["owner"].map(
        owner_to_number
    )
)


# ============================================================
# VARIANT GROUPING
# ============================================================

variant_counts = (
    cars_df["variant"]
    .value_counts()
)

cars_df["variant_grouped"] = (
    cars_df["variant"].where(
        cars_df["variant"].map(
            variant_counts
        ) >= 3,
        "Other"
    )
)


# ============================================================
# DROPDOWN MAPPINGS
# ============================================================

brand_models = {}

for brand in sorted(
    cars_df["brand"]
    .dropna()
    .astype(str)
    .unique()
):

    models = (
        cars_df.loc[
            cars_df["brand"] == brand,
            "model"
        ]
        .dropna()
        .astype(str)
        .unique()
        .tolist()
    )

    brand_models[brand] = sorted(
        models
    )


model_variants = {}

for (
    brand,
    model_name
), group in cars_df.groupby(
    ["brand", "model"]
):

    variants = (
        group["variant"]
        .dropna()
        .astype(str)
        .unique()
        .tolist()
    )

    model_variants[
        f"{brand}|||{model_name}"
    ] = sorted(
        variants
    )


brands = sorted(
    cars_df["brand"]
    .dropna()
    .astype(str)
    .unique()
    .tolist()
)

fuels = sorted(
    cars_df["fuel"]
    .dropna()
    .astype(str)
    .unique()
    .tolist()
)

transmissions = sorted(
    cars_df["transmission"]
    .dropna()
    .astype(str)
    .unique()
    .tolist()
)

owners = sorted(
    cars_df["owner"]
    .dropna()
    .astype(str)
    .unique()
    .tolist()
)

seats = sorted(
    {
        int(float(x))
        for x in cars_df["seats"]
        .dropna()
        .unique()
        if float(x).is_integer()
    }
)


# ============================================================
# PRICE PREDICTION
# ============================================================

def prepare_car_for_prediction(row):

    row = row.copy()

    row["car_age"] = (
        REFERENCE_YEAR -
        float(row["year"])
    )

    row["engine_liters"] = (
        float(row["engine_cc"]) /
        1000
    )

    row["km_per_year"] = (
        float(row["distance"]) /
        max(row["car_age"], 1)
    )

    row["is_automatic"] = int(
        "automatic"
        in str(
            row["transmission"]
        ).lower()
    )

    title = (
        f'{row["year"]} '
        f'{row["brand"]} '
        f'{row["model"]} '
        f'{row["variant"]}'
    )

    row["is_ev"] = get_flag(
        title,
        r"\bEV\b|Electric"
    )

    row["has_turbo"] = get_flag(
        title,
        r"\bTurbo\b|\bT-GDI\b|\bTSI\b|\bTFSI\b|\bi-Turbo\b"
    )

    row["has_sunroof"] = get_flag(
        title,
        r"Sunroof|Moonroof"
    )

    row["has_awd_4wd"] = get_flag(
        title,
        r"\bAWD\b|\b4WD\b|\b4X4\b"
    )

    row["has_dct_cvt"] = get_flag(
        title,
        r"\bDCT\b|\bCVT\b"
    )

    row["has_sport"] = get_flag(
        title,
        r"\bSport\b|\bAMG\b|\bM\b|\bRS\b|\bGT\b"
    )

    row["has_luxury_trim"] = get_flag(
        title,
        r"Luxury|Premium|Ultimate|Signature|Exclusive|Top"
    )

    row["owner_number"] = owner_to_number(
        row["owner"]
    )

    variant = str(
        row["variant"]
    )

    if variant_counts.get(
        variant,
        0
    ) >= 3:
        row["variant_grouped"] = variant
    else:
        row["variant_grouped"] = "Other"

    return row


def predict_car_price(row):

    prepared = (
        prepare_car_for_prediction(
            row
        )
    )

    prediction_df = pd.DataFrame(
        [prepared]
    )

    prediction = model.predict(
        prediction_df
    )[0]

    return float(
        prediction
    )


# ============================================================
# RECOMMENDATION SCORING
# ============================================================

def calculate_match_score(
    row,
    budget,
    fuel=None,
    transmission=None,
    mileage=None,
    seats_required=None,
    max_distance=None,
    max_age=None
):

    score = 0

    price = float(
        row["price"]
    )

    if budget and budget > 0:

        if price <= budget:
            budget_score = 30

        else:
            difference = (
                price - budget
            ) / budget

            budget_score = max(
                0,
                30 * (1 - difference)
            )

        score += budget_score

    if fuel:

        if (
            str(row["fuel"]).lower()
            == str(fuel).lower()
        ):
            score += 15

    if transmission:

        if (
            str(row["transmission"]).lower()
            == str(transmission).lower()
        ):
            score += 15

    if (
        mileage
        and pd.notna(row["mileage"])
    ):

        if (
            float(row["mileage"])
            >= float(mileage)
        ):
            score += 10

        else:
            difference = (
                float(mileage)
                - float(row["mileage"])
            )

            score += max(
                0,
                10 - difference
            )

    if seats_required:

        if (
            float(row["seats"])
            >= float(seats_required)
        ):
            score += 10

    if max_distance:

        distance = float(
            row["distance"]
        )

        if distance <= max_distance:
            score += 10

        else:
            difference = (
                distance - max_distance
            ) / max_distance

            score += max(
                0,
                10 * (1 - difference)
            )

    if max_age:

        age = (
            REFERENCE_YEAR -
            int(row["year"])
        )

        if age <= max_age:
            score += 10

        else:
            difference = (
                age - max_age
            )

            score += max(
                0,
                10 - difference
            )

    return round(
        min(score, 100),
        2
    )


# ============================================================
# HOME
# ============================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "success": True,
        "message": "Car Price Prediction API is running",
        "cars_available": len(cars_df)
    })


# ============================================================
# OPTIONS
# ============================================================

@app.route(
    "/options",
    methods=["GET", "OPTIONS"]
)
def options():

    response = jsonify({
        "success": True,
        "brands": brands,
        "brand_models": brand_models,
        "model_variants": model_variants,
        "fuels": fuels,
        "transmissions": transmissions,
        "owners": owners,
        "seats": seats
    })

    # Prevent browser/proxy from serving stale options
    response.headers["Cache-Control"] = (
        "no-store, no-cache, must-revalidate, max-age=0"
    )

    response.headers["Pragma"] = "no-cache"

    return response


# ============================================================
# PREDICT
# ============================================================

@app.route(
    "/predict",
    methods=["POST", "OPTIONS"]
)
def predict():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "error": "No prediction data received."
            }), 400

        brand = str(
            data.get("brand", "")
        ).strip()

        model_name = str(
            data.get("model", "")
        ).strip()

        variant = str(
            data.get("variant", "")
        ).strip()

        fuel = str(
            data.get("fuel", "")
        ).strip()

        transmission = str(
            data.get("transmission", "")
        ).strip()

        owner = str(
            data.get("owner", "")
        ).strip()

        if brand not in brand_models:

            return jsonify({
                "success": False,
                "error": (
                    f"Brand '{brand}' is not "
                    "available in the dataset."
                )
            }), 400

        if (
            model_name
            not in brand_models[brand]
        ):

            return jsonify({
                "success": False,
                "error": (
                    f"Model '{model_name}' does not "
                    f"belong to brand '{brand}'."
                )
            }), 400

        variant_key = (
            f"{brand}|||{model_name}"
        )

        valid_variants = (
            model_variants.get(
                variant_key,
                []
            )
        )

        if variant not in valid_variants:

            return jsonify({
                "success": False,
                "error": (
                    f"Variant '{variant}' is not "
                    f"available for {brand} "
                    f"{model_name}."
                )
            }), 400

        if fuel not in fuels:

            return jsonify({
                "success": False,
                "error": (
                    "Selected fuel is not "
                    "available in the dataset."
                )
            }), 400

        if transmission not in transmissions:

            return jsonify({
                "success": False,
                "error": (
                    "Selected transmission is not "
                    "available in the dataset."
                )
            }), 400

        if owner not in owners:

            return jsonify({
                "success": False,
                "error": (
                    "Selected owner type is not "
                    "available in the dataset."
                )
            }), 400

        year = int(
            float(data.get("year"))
        )

        distance = float(
            data.get("distance")
        )

        engine_cc = float(
            data.get("engine_cc")
        )

        mileage_value = data.get(
            "mileage"
        )

        if mileage_value in [
            None,
            "",
            "null"
        ]:
            mileage = np.nan
        else:
            mileage = float(
                mileage_value
            )

        seats_value = float(
            data.get("seats")
        )

        if int(seats_value) not in seats:

            return jsonify({
                "success": False,
                "error": (
                    "Selected seats value is "
                    "not available in the dataset."
                )
            }), 400

        input_row = {
            "brand": brand,
            "model": model_name,
            "variant": variant,
            "year": year,
            "distance": distance,
            "engine_cc": engine_cc,
            "mileage": mileage,
            "seats": int(seats_value),
            "fuel": fuel,
            "transmission": transmission,
            "owner": owner
        }

        predicted_price = (
            predict_car_price(
                input_row
            )
        )

        return jsonify({

            "success": True,

            "predicted_price": round(
                predicted_price
            ),

            "model_name": (
                "ExtraTrees Regressor"
            ),

            "r2_score": 0.869977,

            "car": {
                "brand": brand,
                "model": model_name,
                "variant": variant,
                "year": year,
                "distance": distance,
                "engine_cc": engine_cc,
                "mileage": (
                    None
                    if pd.isna(mileage)
                    else mileage
                ),
                "seats": int(
                    seats_value
                ),
                "fuel": fuel,
                "transmission": transmission,
                "owner": owner
            }
        })

    except Exception as e:

        print(
            "Prediction error:",
            str(e)
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# RECOMMEND
# ============================================================

@app.route(
    "/recommend",
    methods=["POST", "OPTIONS"]
)
def recommend():

    try:

        data = request.get_json() or {}

        budget = float(
            data.get("budget", 0)
        )

        fuel = (
            data.get("fuel")
            or None
        )

        transmission = (
            data.get("transmission")
            or None
        )

        mileage = data.get(
            "mileage"
        )

        if mileage not in [
            None,
            "",
            "null"
        ]:
            mileage = float(
                mileage
            )
        else:
            mileage = None

        seats_required = data.get(
            "seats"
        )

        if seats_required not in [
            None,
            "",
            "null"
        ]:
            seats_required = int(
                seats_required
            )
        else:
            seats_required = None

        max_distance = data.get(
            "max_distance"
        )

        if max_distance not in [
            None,
            "",
            "null"
        ]:
            max_distance = float(
                max_distance
            )
        else:
            max_distance = None

        max_age = data.get(
            "max_age"
        )

        if max_age not in [
            None,
            "",
            "null"
        ]:
            max_age = int(
                max_age
            )
        else:
            max_age = None

        filtered = cars_df.copy()

        if budget > 0:

            filtered = filtered[
                filtered["price"] <= budget
            ]

        if fuel:

            filtered = filtered[
                filtered["fuel"]
                .astype(str)
                .str.lower()
                == str(fuel).lower()
            ]

        if transmission:

            filtered = filtered[
                filtered["transmission"]
                .astype(str)
                .str.lower()
                == str(transmission).lower()
            ]

        if seats_required:

            filtered = filtered[
                filtered["seats"]
                >= seats_required
            ]

        if max_distance:

            filtered = filtered[
                filtered["distance"]
                <= max_distance
            ]

        if max_age:

            filtered = filtered[
                (
                    REFERENCE_YEAR
                    - filtered["year"]
                ) <= max_age
            ]

        if len(filtered) == 0:

            filtered = cars_df.copy()

            if fuel:

                filtered = filtered[
                    filtered["fuel"]
                    .astype(str)
                    .str.lower()
                    == str(fuel).lower()
                ]

            if transmission:

                filtered = filtered[
                    filtered["transmission"]
                    .astype(str)
                    .str.lower()
                    == str(transmission).lower()
                ]

            if len(filtered) == 0:

                filtered = cars_df.copy()

        filtered = filtered.copy()

        filtered["match_score"] = (
            filtered.apply(
                lambda row:
                calculate_match_score(
                    row,
                    budget,
                    fuel,
                    transmission,
                    mileage,
                    seats_required,
                    max_distance,
                    max_age
                ),
                axis=1
            )
        )

        filtered = filtered.sort_values(
            by=[
                "match_score",
                "price"
            ],
            ascending=[
                False,
                True
            ]
        )

        results = []

        for _, row in filtered.head(
            12
        ).iterrows():

            try:

                estimated_price = (
                    predict_car_price(
                        row.to_dict()
                    )
                )

            except Exception:

                estimated_price = float(
                    row["price"]
                )

            results.append({

                "title": row["title"],

                "brand": row["brand"],

                "model": row["model"],

                "variant": row["variant"],

                "year": int(
                    row["year"]
                ),

                "actual_price": float(
                    row["price"]
                ),

                "estimated_price": round(
                    estimated_price
                ),

                "distance": float(
                    row["distance"]
                ),

                "mileage": (
                    None
                    if pd.isna(
                        row["mileage"]
                    )
                    else float(
                        row["mileage"]
                    )
                ),

                "fuel": row["fuel"],

                "transmission": (
                    row["transmission"]
                ),

                "owner": row["owner"],

                "seats": (
                    int(row["seats"])
                    if pd.notna(
                        row["seats"]
                    )
                    else None
                ),

                "car_age": int(
                    REFERENCE_YEAR
                    - row["year"]
                ),

                "match_score": float(
                    row["match_score"]
                ),

                "url": row.get(
                    "url",
                    ""
                )
            })

        return jsonify({

            "success": True,

            "count": len(
                results
            ),

            "results": results
        })

    except Exception as e:

        print(
            "Recommendation error:",
            str(e)
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    print("")
    print("=" * 60)
    print("CAR PRICE PREDICTION API")
    print("=" * 60)

    print(
        f"Cars available: {len(cars_df)}"
    )

    print(
        f"Brands: {len(brands)}"
    )

    print(
        f"Models: {cars_df['model'].nunique()}"
    )

    print(
        f"Variants: {cars_df['variant'].nunique()}"
    )

    print("")
    print(
        "Server: http://127.0.0.1:5000"
    )
    print("=" * 60)
    print("")

    port = int(
        os.environ.get(
            "PORT",
            5000
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )