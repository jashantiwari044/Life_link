from backend.core.config import settings


def test_root_endpoint_returns_operational_message(api_client):
    response = api_client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": f"{settings.PROJECT_NAME} operational"}


def test_health_endpoint_returns_healthy_status(api_client):
    response = api_client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}