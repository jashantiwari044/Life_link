import json
import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager


@pytest.fixture
def driver():
    options = Options()
    if os.getenv("CI", "false").lower() == "true" or os.getenv("HEADLESS", "true").lower() == "true":
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

    browser = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    browser.set_window_size(1920, 1080)

    try:
        yield browser
    finally:
        browser.quit()


@pytest.fixture
def base_url():
    with open(os.path.join(os.path.dirname(__file__), "config.json"), "r", encoding="utf-8") as handle:
        config = json.load(handle)
    return config.get("base_url", "https://magical-dragon-e850c1.netlify.app")
