from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class DashboardPage(BasePage):
    GREETING = (By.XPATH, "//*[contains(normalize-space(.), 'Hello,')]")

    def is_loaded(self):
        element = self.wait.until(EC.visibility_of_element_located(self.GREETING))
        return "Hello," in element.text
