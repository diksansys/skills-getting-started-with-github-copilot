import copy
import urllib.parse

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities as activities_db


@pytest.fixture(autouse=True)
def reset_activities():
    # Make a deep copy of the in-memory activities and restore after each test
    original = copy.deepcopy(activities_db)
    yield
    activities_db.clear()
    activities_db.update(original)


@pytest.fixture()
def client():
    return TestClient(app)


def encode(name: str) -> str:
    return urllib.parse.quote(name, safe="")


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Expect at least one known activity
    assert "Chess Club" in data


def test_signup_and_unregister_flow(client):
    activity = "Chess Club"
    email = "tester@example.com"

    # Ensure email not present initially
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]

    # Sign up
    resp = client.post(f"/activities/{encode(activity)}/signup?email={urllib.parse.quote(email, safe='')}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Verify participant added
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email in resp.json()[activity]["participants"]

    # Unregister
    resp = client.post(f"/activities/{encode(activity)}/unregister?email={urllib.parse.quote(email, safe='')}")
    assert resp.status_code == 200
    assert "Unregistered" in resp.json().get("message", "")

    # Verify participant removed
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]


def test_signup_duplicate_returns_400(client):
    activity = "Chess Club"
    existing = activities_db[activity]["participants"][0]

    resp = client.post(f"/activities/{encode(activity)}/signup?email={urllib.parse.quote(existing, safe='')}")
    assert resp.status_code == 400


def test_unregister_not_registered_returns_404(client):
    activity = "Chess Club"
    email = "not-registered@example.com"

    resp = client.post(f"/activities/{encode(activity)}/unregister?email={urllib.parse.quote(email, safe='')}")
    assert resp.status_code == 404
