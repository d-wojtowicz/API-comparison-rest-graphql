# API Documentation

This directory contains Postman collections for testing the APIs in this project.

## Collections

- `backend-rest.postman_collection.json` - REST API endpoints

## Setup Instructions

1. **Import Collections**: Import the `.json` file into Postman
2. **Set up Environment**: Create a new environment in Postman with the following variables:
   - `base_url`: `http://localhost:4001` (or your server URL)
   - `auth_token`: Your JWT authentication token

## Environment Variables

The collections use the following environment variables:
- `{{base_url}}` - Base URL for the API
- `{{auth_token}}` - JWT authentication token

## Running Tests

1. Start your backend server
2. Import the collection into Postman
3. Set up your environment variables
4. Run the requests in the collection

## Notes

- Environment files with sensitive data (API keys, tokens) are not included in the repository
- Create your own environment file with your specific configuration
- Update the collection when API endpoints change 