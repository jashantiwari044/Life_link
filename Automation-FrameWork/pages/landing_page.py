from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage
from .login_page import LoginPage
from .register_page import RegisterPage


class LandingPage(BasePage):
    HERO_HEADING = (By.XPATH, "//h1[contains(., 'Donate Blood. Save Lives.')]")

    def open(self):
        return super().open("/")

    def get_heading_text(self):
        element = self.wait.until(EC.visibility_of_element_located(self.HERO_HEADING))
        return element.text

    def go_to_login(self):
        self.click_link("Login")
        return LoginPage(self.driver, self.base_url)

    def go_to_register(self):
        self.click_link("Register")
        return RegisterPage(self.driver, self.base_url)
