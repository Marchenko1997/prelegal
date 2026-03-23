from unittest.mock import MagicMock, patch

import pytest


async def test_chat_returns_200_with_valid_payload(client):
    mock_response = {
        "reply": "Hello! Let's get started. What is the purpose of this NDA?",
        "fields": {
            "purpose": None,
            "effective_date": None,
            "mnda_term_type": None,
            "mnda_term_years": None,
            "confidentiality_term_type": None,
            "confidentiality_term_years": None,
            "governing_law_state": None,
            "jurisdiction": None,
            "modifications": None,
            "party1_print_name": None,
            "party1_title": None,
            "party1_company": None,
            "party1_notice_address": None,
            "party2_print_name": None,
            "party2_title": None,
            "party2_company": None,
            "party2_notice_address": None,
        },
    }

    mock_choice = MagicMock()
    mock_choice.message.content = (
        '{"reply": "Hello! Let\'s get started. What is the purpose of this NDA?", '
        '"fields": {"purpose": null, "effective_date": null, "mnda_term_type": null, '
        '"mnda_term_years": null, "confidentiality_term_type": null, '
        '"confidentiality_term_years": null, "governing_law_state": null, '
        '"jurisdiction": null, "modifications": null, "party1_print_name": null, '
        '"party1_title": null, "party1_company": null, "party1_notice_address": null, '
        '"party2_print_name": null, "party2_title": null, "party2_company": null, '
        '"party2_notice_address": null}}'
    )
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]

    with patch("services.chat.completion", return_value=mock_completion):
        r = await client.post(
            "/api/chat",
            json={"messages": [], "current_fields": {}},
        )

    assert r.status_code == 200
    data = r.json()
    assert "reply" in data
    assert "fields" in data
    assert data["reply"] == mock_response["reply"]


async def test_chat_carries_forward_collected_fields(client):
    """Fields returned by AI persist in the response."""
    mock_choice = MagicMock()
    mock_choice.message.content = (
        '{"reply": "Got it. Now, what is the effective date?", '
        '"fields": {"purpose": "Evaluating a partnership", "effective_date": null, '
        '"mnda_term_type": null, "mnda_term_years": null, '
        '"confidentiality_term_type": null, "confidentiality_term_years": null, '
        '"governing_law_state": null, "jurisdiction": null, "modifications": null, '
        '"party1_print_name": null, "party1_title": null, "party1_company": null, '
        '"party1_notice_address": null, "party2_print_name": null, '
        '"party2_title": null, "party2_company": null, "party2_notice_address": null}}'
    )
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]

    with patch("services.chat.completion", return_value=mock_completion):
        r = await client.post(
            "/api/chat",
            json={
                "messages": [
                    {"role": "user", "content": "It is for evaluating a partnership."}
                ],
                "current_fields": {},
            },
        )

    assert r.status_code == 200
    assert r.json()["fields"]["purpose"] == "Evaluating a partnership"


async def test_chat_invalid_message_role_returns_422(client):
    r = await client.post(
        "/api/chat",
        json={
            "messages": [{"role": "system", "content": "hack"}],
            "current_fields": {},
        },
    )
    assert r.status_code == 422
