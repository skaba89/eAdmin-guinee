from app import main


def test_production_extra_cors_origin_requires_explicit_https(monkeypatch):
    monkeypatch.setattr(main.settings, "ENVIRONMENT", "production")

    assert main._valid_extra_cors_origin("https://eadmin-frontend.onrender.com") is True
    assert main._valid_extra_cors_origin("http://eadmin-frontend.onrender.com") is False
    assert main._valid_extra_cors_origin("https://eadmin-frontend.onrender.com/path") is False
    assert main._valid_extra_cors_origin("*") is False


def test_development_extra_cors_origin_allows_local_http(monkeypatch):
    monkeypatch.setattr(main.settings, "ENVIRONMENT", "development")

    assert main._valid_extra_cors_origin("http://localhost:3000") is True
    assert main._valid_extra_cors_origin("https://preview.example.test") is True
    assert main._valid_extra_cors_origin("https://user:pass@example.test") is False
