import json
import os

class ConfigReader:
    def __init__(self, filename="config.json"):
        # Locates the file relative to this script's directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.file_path = os.path.join(current_dir, filename)
        self.data = self._load_config()

    def _load_config(self):
        # Set the given configuration
        with open(self.file_path, "file" if os.path.exists(self.file_path) else "r") as f:
            return json.load(f)

    def get_value(self, key, default=None):
        """Fetches a top-level configuration value."""
        return self.data.get(key, default)

    def get_nested_value(self, parent_key, child_key, default=None):
        """Fetches nested configurations like credentials."""
        parent = self.data.get(parent_key, {})
        return parent.get(child_key, default)
