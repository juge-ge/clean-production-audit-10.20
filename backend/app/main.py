"""Optional FastAPI service boundary; business functions remain front-end demos."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="清洁生产智慧审核平台", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5178", "http://localhost:5178"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health():
    return {"status": "ok", "mode": "frontend-prototype"}


@app.get("/api/v1/capabilities")
def capabilities():
    return {
        "authentication": "not_implemented",
        "document_extraction": "not_connected",
        "audit_evaluation": "awaiting_standards",
        "message": "当前版本仅提供前端演示；未实现真实 JWT、文档解析或业务 API。",
    }
