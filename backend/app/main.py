from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import api_router
from backend.app.errors import ApiError, api_error_handler

app = FastAPI(
    title="PyrosHarmonizer API",
    version="1.0.0",
    description="API REST para armonizar focos MODIS y VIIRS. Las tablas de fuego pueden venir vacías hasta que se carguen los CSV de FIRMS.",
)
app.add_exception_handler(ApiError, api_error_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api/v1")
