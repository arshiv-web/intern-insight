import os

from flask import Flask, jsonify
from flask_cors import CORS

from app.api.cards import bp as cards_bp
from app.api.meetings import bp as meetings_bp
from app.database import db


def create_app():
    """
    Flask application factory.
    """

    # -----------------------------------------------------
    # Vercel-Compatible App Setup
    # -----------------------------------------------------

    if os.getenv("VERCEL"):
        app = Flask(
            __name__,
            instance_path="/tmp"
        )
    else:
        app = Flask(__name__)

    # -----------------------------------------------------
    # Database Configuration
    # -----------------------------------------------------

    database_url = os.getenv(
        "DATABASE_URL",
        "sqlite:////tmp/interninsight.db"
    )

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    engine_options: dict = {
        "pool_pre_ping": True,
    }

    if database_url.startswith(
        "sqlite"
    ):
        engine_options["connect_args"] = {
            "check_same_thread": False,
            "timeout": 30,
        }

    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = (
        engine_options
    )

    # -----------------------------------------------------
    # Security / Session Config
    # -----------------------------------------------------

    app.config["SECRET_KEY"] = os.getenv(
        "SECRET_KEY",
        "dev-secret-key-change-in-production"
    )

    app.config["SESSION_COOKIE_SECURE"] = (
        os.getenv("FLASK_ENV") == "production"
    )

    app.config["SESSION_COOKIE_HTTPONLY"] = True

    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

    # -----------------------------------------------------
    # Initialize Database
    # -----------------------------------------------------

    db.init_app(app)

    # -----------------------------------------------------
    # CORS Configuration
    # -----------------------------------------------------

    cors_origins = ["*"]

    if os.getenv("VERCEL_URL"):
        cors_origins.append(
            f"https://{os.getenv('VERCEL_URL')}"
        )

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": cors_origins
            }
        },
        supports_credentials=True
    )

    # -----------------------------------------------------
    # Register API Blueprints
    # -----------------------------------------------------

    app.register_blueprint(
        meetings_bp,
        url_prefix="/api/meetings"
    )

    app.register_blueprint(
        cards_bp,
        url_prefix="/api/cards"
    )

    # -----------------------------------------------------
    # Root Route
    # -----------------------------------------------------

    @app.route("/")
    def root():
        return jsonify({
            "name": "InternInsight API",
            "description": (
                "AI operational clarity engine "
                "for engineering meetings"
            ),
            "version": "2.0.0",
            "environment": (
                "vercel"
                if os.getenv("VERCEL")
                else "local"
            )
        })

    # -----------------------------------------------------
    # Health Check
    # -----------------------------------------------------

    @app.route("/health")
    def health_check():

        db_status = "not_tested"
        db_error = None

        if os.getenv("DATABASE_URL"):

            try:

                with app.app_context():
                    db.session.execute(
                        db.text("SELECT 1")
                    )

                db_status = "connected"

            except Exception as error:

                db_status = "error"

                db_error = str(error)[:100]

        else:
            db_status = "no_database_url"

        return jsonify({
            "status": "healthy",
            "database": db_status,
            "database_error": db_error,
            "database_url_configured": bool(
                os.getenv("DATABASE_URL")
            ),
            "vercel": bool(
                os.getenv("VERCEL")
            )
        })

    # -----------------------------------------------------
    # Create Tables (Local Only)
    # -----------------------------------------------------

    if not os.getenv("VERCEL"):

        with app.app_context():
            db.create_all()

    return app


# =========================================================
# App Instance
# =========================================================

app = create_app()