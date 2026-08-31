from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage
from .dashboard_page import DashboardPage


class RegisterPage(BasePage):
    PAGE_TITLE = (By.XPATH, "//*[contains(normalize-space(.), 'Create Account')]")
    FULL_NAME_INPUT = (By.ID, "fullName")
    DOB_INPUT = (By.ID, "dob")
    BLOOD_GROUP_INPUT = (By.ID, "bloodGroup")
    AADHAAR_INPUT = (By.ID, "aadhaar")
    PHONE_INPUT = (By.ID, "phone")
    EMAIL_INPUT = (By.ID, "email")
    ADDRESS_INPUT = (By.ID, "address")
    PASSWORD_INPUT = (By.ID, "password")
    CONFIRM_PASSWORD_INPUT = (By.ID, "confirmPassword")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")

    def open(self):
        return super().open("/register")

    def is_loaded(self):
        element = self.wait.until(EC.visibility_of_element_located(self.PAGE_TITLE))
        return "Create Account" in element.text

    def register_normal_user(self, full_name, dob, blood_group, aadhaar, phone, email, address, password):
        self.wait.until(EC.visibility_of_element_located(self.FULL_NAME_INPUT)).send_keys(full_name)
        self.wait.until(EC.visibility_of_element_located(self.DOB_INPUT)).send_keys(dob)
        self.wait.until(EC.visibility_of_element_located(self.BLOOD_GROUP_INPUT)).send_keys(blood_group)
        self.wait.until(EC.visibility_of_element_located(self.AADHAAR_INPUT)).send_keys(aadhaar)
        self.wait.until(EC.visibility_of_element_located(self.PHONE_INPUT)).send_keys(phone)
        self.wait.until(EC.visibility_of_element_located(self.EMAIL_INPUT)).send_keys(email)
        self.wait.until(EC.visibility_of_element_located(self.ADDRESS_INPUT)).send_keys(address)
        self.wait.until(EC.visibility_of_element_located(self.PASSWORD_INPUT)).send_keys(password)
        self.wait.until(EC.visibility_of_element_located(self.CONFIRM_PASSWORD_INPUT)).send_keys(password)
        self.wait.until(EC.element_to_be_clickable(self.SUBMIT_BUTTON)).click()
        return DashboardPage(self.driver, self.base_url)
