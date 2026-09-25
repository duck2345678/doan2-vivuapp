from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ViVu AI" in data["service"]

def test_generate_plan_valid_contract():
    payload = {
        "session_id": "sess_test_001",
        "user_id": "user_123",
        "raw_prompt": "Đà Lạt 3 ngày 2 người 5 triệu thích cà phê và thiên nhiên",
        "user_preferences": {"travel_style": "BALANCED"},
    }
    response = client.post("/api/v1/plan/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["session_id"] == "sess_test_001"
    assert data["intent"] == "CREATE_PLAN"
    assert data["parsed_request"] is not None
    assert data["parsed_request"]["destination_city"] == "Đà Lạt"
    assert len(data["candidate_pool"]) > 0
    assert data["selected_hotel"] is not None
    assert data["selected_hotel"]["category"] == "HOTEL"
    assert data["optimization_exhausted"] is False
    assert len(data["trace_logs"]) >= 3
    assert len(data["itinerary_days"]) == 3
    place_ids = [slot["place_id"] for day in data["itinerary_days"] for slot in day["time_slots"]]
    assert place_ids
    assert len(place_ids) == len(set(place_ids))

def test_generate_plan_clarification_endpoint():
    payload = {
        "session_id": "sess_clarify_001",
        "user_id": "user_123",
        "raw_prompt": "Đi Đà Lạt 3 ngày 2 người",
    }
    response = client.post("/api/v1/plan/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["intent"] == "CLARIFICATION_NEEDED"
    assert data["clarification_question"] is not None
    assert "ngân sách" in data["clarification_question"].lower()
    assert data["final_response_text"] == data["clarification_question"]
    assert len(data["candidate_pool"]) == 0

def test_generate_plan_invalid_short_prompt():
    payload = {
        "session_id": "sess_test_002",
        "raw_prompt": "a", # min_length=2 required
    }
    response = client.post("/api/v1/plan/generate", json=payload)
    assert response.status_code == 422
    err_data = response.json()
    assert err_data["success"] is False
    assert err_data["error_code"] == "VALIDATION_ERROR"
    assert "raw_prompt" in err_data["message"]

