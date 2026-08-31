from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage
from .dashboard_page import DashboardPage


class LoginPage(BasePage):
    IDENTIFIER_INPUT = (By.ID, "identifier")
    PASSWORD_INPUT = (By.ID, "password")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    PAGE_TITLE = (By.XPATH, "//*[contains(normalize-space(.), 'Welcome Back')]")

    def open(self):
        return super().open("/login")

    def is_loaded(self):
        element = self.wait.until(EC.visibility_of_element_located(self.PAGE_TITLE))
        return "Welcome Back" in element.text

    def enter_identifier(self, identifier):
        self.wait.until(EC.visibility_of_element_located(self.IDENTIFIER_INPUT)).send_keys(identifier)
        return self

    def enter_password(self, password):
        self.wait.until(EC.visibility_of_element_located(self.PASSWORD_INPUT)).send_keys(password)
        return self

    def submit(self):
        self.wait.until(EC.element_to_be_clickable(self.SUBMIT_BUTTON)).click()
        return self

    def login(self, identifier, password):
        self.enter_identifier(identifier)
        self.enter_password(password)
        self.submit()
        return DashboardPage(self.driver, self.base_url)
