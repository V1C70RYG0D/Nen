import os
import yaml
import json
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv('.env')

# Configure logging
logging.basicConfig(filename='config_validation.log', level=logging.DEBUG,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# Load YAML file
with open('config/docker-compose.test.yml', 'r') as yaml_file:
    test_yaml_config = yaml.safe_load(yaml_file)

with open('config/docker-compose.prod.yml', 'r') as yaml_file:
    prod_yaml_config = yaml.safe_load(yaml_file)

with open('infrastructure/docker/docker-compose.dev.yml', 'r') as yaml_file:
    dev_yaml_config = yaml.safe_load(yaml_file)

# Load package.json for additional configuration
with open('package.json', 'r') as json_file:
    package_json = json.load(json_file)

# Define expected settings from .env
expected_settings = {
    'FRONTEND_PORT': os.getenv('DEV_FRONTEND_PORT'),
    'BACKEND_PORT': os.getenv('DEV_BACKEND_PORT'),
    'REDIS_PORT': os.getenv('REDIS_PORT'),
    'SOLANA_RPC_URL': os.getenv('SOLANA_RPC_URL')
}

# Validate configurations

def validate_configs():
    logging.info("Starting configuration validation...")
    discrepancies = []

    # Example check: Frontend Port
    if str(dev_yaml_config['services']['frontend']['ports'][0].split(':')[0]) != expected_settings['FRONTEND_PORT']:
        discrepancies.append(f"Frontend port mismatch: .env({expected_settings['FRONTEND_PORT']}), YAML({dev_yaml_config['services']['frontend']['ports'][0].split(':')[0]})")

    # Further checks can be implemented below for other services and settings

    # Example check: Solana RPC URL
    if prod_yaml_config['services']['web']['environment'][2].split('=')[1] != expected_settings['SOLANA_RPC_URL']:
        discrepancies.append(f"SOLANA_RPC_URL mismatch: .env({expected_settings['SOLANA_RPC_URL']}), YAML({prod_yaml_config['services']['web']['environment'][2].split('=')[1]})")

    # Output discrepancies
    if discrepancies:
        for discrepancy in discrepancies:
            logging.error(discrepancy)
    else:
        logging.info("All configurations are consistent.")

# Run validation
validate_configs()

