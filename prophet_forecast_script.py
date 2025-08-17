
"""
Prophet AI Forecasting Script for Sales Data

This script demonstrates how to use Facebook Prophet for time series forecasting
of sales data. It includes data cleaning, model training, and prediction generation.

Requirements:
- pandas
- prophet
- psycopg2-binary (for PostgreSQL connection)
- python-dotenv (for environment variables)

Install with: pip install pandas prophet psycopg2-binary python-dotenv
"""

import pandas as pd
import numpy as np
from prophet import Prophet
import psycopg2
from datetime import datetime, timedelta
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ProphetForecaster:
    def __init__(self, db_connection_string=None):
        """
        Initialize the Prophet Forecaster
        
        Args:
            db_connection_string (str): PostgreSQL connection string
        """
        self.db_connection_string = db_connection_string or os.getenv('DATABASE_URL')
        self.connection = None
        
    def connect_to_database(self):
        """Establish database connection"""
        try:
            self.connection = psycopg2.connect(self.db_connection_string)
            logger.info("Successfully connected to database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def fetch_sales_data(self, user_id):
        """
        Fetch sales data from database for a specific user
        
        Args:
            user_id (str): User ID to fetch data for
            
        Returns:
            pd.DataFrame: Sales data with columns [product_id, product_name, date, quantity_sold]
        """
        try:
            query = """
            SELECT 
                sd.product_id,
                p.name as product_name,
                sd.date,
                sd.quantity_sold,
                sd.unit_price
            FROM sales_data sd
            INNER JOIN products p ON sd.product_id = p.id
            WHERE sd.user_id = %s
            ORDER BY p.name, sd.date
            """
            
            df = pd.read_sql_query(query, self.connection, params=(user_id,))
            logger.info(f"Fetched {len(df)} sales records for user {user_id}")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching sales data: {e}")
            raise
    
    def clean_and_prepare_data(self, df):
        """
        Clean and prepare data for Prophet forecasting
        
        Args:
            df (pd.DataFrame): Raw sales data
            
        Returns:
            dict: Dictionary with product_id as key and cleaned DataFrame as value
        """
        cleaned_data = {}
        
        try:
            # Group by product
            for product_id, group in df.groupby('product_id'):
                product_name = group['product_name'].iloc[0]
                logger.info(f"Cleaning data for product: {product_name} (ID: {product_id})")
                
                # Prepare data for Prophet (requires 'ds' and 'y' columns)
                product_data = group.copy()
                product_data['ds'] = pd.to_datetime(product_data['date'])
                product_data['y'] = product_data['quantity_sold']
                
                # Remove duplicates and sort by date
                product_data = product_data.drop_duplicates(subset=['ds']).sort_values('ds')
                
                # Handle missing values
                product_data['y'] = product_data['y'].fillna(0)
                
                # Ensure we have enough data points (Prophet needs at least 2)
                if len(product_data) < 2:
                    logger.warning(f"Insufficient data for {product_name}. Skipping.")
                    continue
                
                # Remove outliers (values beyond 3 standard deviations)
                mean_sales = product_data['y'].mean()
                std_sales = product_data['y'].std()
                if std_sales > 0:
                    outlier_threshold = mean_sales + 3 * std_sales
                    product_data.loc[product_data['y'] > outlier_threshold, 'y'] = outlier_threshold
                
                # Store cleaned data
                cleaned_data[product_id] = {
                    'data': product_data[['ds', 'y']],
                    'product_name': product_name
                }
                
                logger.info(f"Cleaned data for {product_name}: {len(product_data)} records")
                
        except Exception as e:
            logger.error(f"Error cleaning data: {e}")
            raise
            
        return cleaned_data
    
    def train_and_forecast(self, product_data, forecast_periods=[7, 30, 90, 365]):
        """
        Train Prophet model and generate forecasts
        
        Args:
            product_data (pd.DataFrame): Cleaned sales data with 'ds' and 'y' columns
            forecast_periods (list): List of periods to forecast
            
        Returns:
            dict: Dictionary containing forecasts and model performance metrics
        """
        try:
            # Initialize Prophet model with reasonable parameters
            model = Prophet(
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=True if len(product_data) > 365 else False,
                seasonality_mode='multiplicative',
                changepoint_prior_scale=0.1,  # Controls flexibility of trend
                seasonality_prior_scale=10.0,  # Controls flexibility of seasonality
                interval_width=0.8  # Uncertainty interval width
            )
            
            # Fit the model
            logger.info("Training Prophet model...")
            model.fit(product_data)
            
            # Generate forecasts for each period
            forecasts = {}
            
            for period in forecast_periods:
                # Create future dataframe
                future = model.make_future_dataframe(periods=period, freq='D')
                
                # Generate forecast
                forecast = model.predict(future)
                
                # Get the forecasted values for the future period
                future_forecast = forecast.tail(period)
                
                # Calculate total forecasted quantity for the period
                total_forecast = max(0, future_forecast['yhat'].sum())
                
                # Get confidence intervals
                lower_bound = future_forecast['yhat_lower'].sum()
                upper_bound = future_forecast['yhat_upper'].sum()
                
                forecasts[f'forecast_{period}d'] = {
                    'value': round(total_forecast),
                    'lower_bound': max(0, round(lower_bound)),
                    'upper_bound': round(upper_bound)
                }
                
                logger.info(f"{period}-day forecast: {round(total_forecast)} units")
            
            # Calculate model performance metrics
            in_sample_forecast = model.predict(product_data)
            mae = np.mean(np.abs(product_data['y'] - in_sample_forecast['yhat']))
            mape = np.mean(np.abs((product_data['y'] - in_sample_forecast['yhat']) / 
                                 np.maximum(product_data['y'], 1))) * 100
            
            # Determine trend status
            recent_trend = forecast.tail(30)['trend'].mean() - forecast.head(30)['trend'].mean()
            if recent_trend > 0.1:
                trend_status = 'trending'
            elif recent_trend < -0.1:
                trend_status = 'declining'
            else:
                trend_status = 'stable'
            
            # Calculate confidence score based on model performance
            confidence_score = max(0.3, min(0.95, 1 - (mape / 100)))
            
            result = {
                'forecasts': forecasts,
                'trend_status': trend_status,
                'confidence_score': confidence_score,
                'mae': mae,
                'mape': mape
            }
            
            logger.info(f"Model trained successfully. MAE: {mae:.2f}, MAPE: {mape:.2f}%")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in training/forecasting: {e}")
            raise
    
    def save_forecasts_to_database(self, user_id, product_id, forecasts_data):
        """
        Save forecast results to database
        
        Args:
            user_id (str): User ID
            product_id (str): Product ID
            forecasts_data (dict): Forecast results from train_and_forecast
        """
        try:
            cursor = self.connection.cursor()
            
            # Delete existing forecasts for this product
            delete_query = """
            DELETE FROM forecast_data 
            WHERE user_id = %s AND product_id = %s
            """
            cursor.execute(delete_query, (user_id, product_id))
            
            # Insert new forecast
            insert_query = """
            INSERT INTO forecast_data (
                user_id, product_id, forecast_7d, forecast_30d, 
                forecast_90d, forecast_365d, trend_status, confidence_score,
                generated_at, expires_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            expires_at = datetime.now() + timedelta(hours=24)
            
            cursor.execute(insert_query, (
                user_id,
                product_id,
                forecasts_data['forecasts']['forecast_7d']['value'],
                forecasts_data['forecasts']['forecast_30d']['value'],
                forecasts_data['forecasts']['forecast_90d']['value'],
                forecasts_data['forecasts']['forecast_365d']['value'],
                forecasts_data['trend_status'],
                forecasts_data['confidence_score'],
                datetime.now(),
                expires_at
            ))
            
            self.connection.commit()
            logger.info(f"Saved forecasts for product {product_id}")
            
        except Exception as e:
            logger.error(f"Error saving forecasts: {e}")
            self.connection.rollback()
            raise
        finally:
            cursor.close()
    
    def run_forecasting_for_user(self, user_id):
        """
        Main method to run complete forecasting pipeline for a user
        
        Args:
            user_id (str): User ID to generate forecasts for
        """
        try:
            logger.info(f"Starting forecasting pipeline for user {user_id}")
            
            # Connect to database
            self.connect_to_database()
            
            # Fetch sales data
            sales_data = self.fetch_sales_data(user_id)
            
            if sales_data.empty:
                logger.warning(f"No sales data found for user {user_id}")
                return
            
            # Clean and prepare data
            cleaned_data = self.clean_and_prepare_data(sales_data)
            
            if not cleaned_data:
                logger.warning(f"No valid data for forecasting for user {user_id}")
                return
            
            # Generate forecasts for each product
            total_products = len(cleaned_data)
            successful_forecasts = 0
            
            for product_id, product_info in cleaned_data.items():
                try:
                    logger.info(f"Generating forecast for {product_info['product_name']}")
                    
                    # Train model and generate forecasts
                    forecast_results = self.train_and_forecast(product_info['data'])
                    
                    # Save to database
                    self.save_forecasts_to_database(user_id, product_id, forecast_results)
                    
                    successful_forecasts += 1
                    
                except Exception as e:
                    logger.error(f"Failed to generate forecast for product {product_id}: {e}")
                    continue
            
            logger.info(f"Forecasting completed. {successful_forecasts}/{total_products} products processed successfully")
            
        except Exception as e:
            logger.error(f"Error in forecasting pipeline: {e}")
            raise
        finally:
            if self.connection:
                self.connection.close()

def main():
    """
    Main function to run the forecasting script
    Usage: python prophet_forecast_script.py [user_id]
    """
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python prophet_forecast_script.py <user_id>")
        sys.exit(1)
    
    user_id = sys.argv[1]
    
    try:
        forecaster = ProphetForecaster()
        forecaster.run_forecasting_for_user(user_id)
        print(f"Forecasting completed successfully for user {user_id}")
    except Exception as e:
        print(f"Forecasting failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
