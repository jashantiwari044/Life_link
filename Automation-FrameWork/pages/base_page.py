from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


class BasePage:
    def __init__(self, driver, base_url):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 10)

    def open(self, path="/"):
        self.driver.get(f"{self.base_url}{path}")
        return self

    def click_link(self, link_text):
        self.wait.until(EC.element_to_be_clickable((By.LINK_TEXT, link_text))).click()
        return self

    def get_page_text(self):
        return self.driver.page_source

    def wait_for_url_contains(self, text):
        self.wait.until(EC.url_contains(text))
        return self
