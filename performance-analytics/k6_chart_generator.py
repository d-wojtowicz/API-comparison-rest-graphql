#!/usr/bin/env python3
"""
K6 Performance Analytics Chart Generator

This script generates line charts from k6 CSV output files.
It reads CSV files from the data directory and creates various performance charts.
"""

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
from datetime import datetime
import os
import argparse
import glob
from pathlib import Path


class K6ChartGenerator:
    def __init__(self, data_dir="data"):
        """
        Initialize the chart generator.
        
        Args:
            data_dir (str): Directory containing CSV files
        """
        self.data_dir = data_dir
        self.setup_plotting_style()
    
    def setup_plotting_style(self):
        """Setup matplotlib styling for better looking charts."""
        plt.style.use('default')
        plt.rcParams['figure.figsize'] = (12, 8)
        plt.rcParams['font.size'] = 10
        plt.rcParams['axes.grid'] = True
        plt.rcParams['grid.alpha'] = 0.3
    
    def load_csv_data(self, csv_file):
        """
        Load and preprocess k6 CSV data with stage information from tags.
        Filters data to only include http_req_duration metrics.
        
        Args:
            csv_file (str): Path to CSV file
            
        Returns:
            pd.DataFrame: Processed DataFrame with stage information
        """
        try:
            df = pd.read_csv(csv_file, low_memory=False)
            
            # Convert timestamp to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
            
            # Filter to only include http_req_duration metrics
            duration_metrics = df[df['metric_name'] == 'http_req_duration']
            
            if duration_metrics.empty:
                print(f"Warning: No http_req_duration metrics found in {csv_file}")
                return pd.DataFrame()
            
            # Extract stage information from tags if available
            if 'extra_tags' in duration_metrics.columns and not duration_metrics['extra_tags'].isna().all():
                duration_metrics = self._extract_stage_from_tags(duration_metrics)
            
            return duration_metrics
            
        except Exception as e:
            print(f"Error loading CSV file {csv_file}: {e}")
            return None
    
    def _extract_stage_from_tags(self, df):
        """
        Extract stage information from k6 tags.
        
        Args:
            df (pd.DataFrame): DataFrame with extra_tags column
            
        Returns:
            pd.DataFrame: DataFrame with stage information added
        """
        # Create a copy to avoid SettingWithCopyWarning
        df = df.copy()
        
        # Initialize stage columns
        df['stage'] = 1
        df['stage_name'] = 'stage_1'
        df['api_type'] = 'unknown'
        
        # Parse tags from extra_tags column
        for idx, row in df.iterrows():
            tags_str = str(row.get('extra_tags', ''))
            if tags_str and tags_str != 'nan' and tags_str != '':
                # Parse tags (format: "stage=1,stage_name=stage_1,api_type=rest" or "stage=1&stage_name=stage_1&api_type=rest")
                tags = {}
                # Try comma separator first, then ampersand
                separator = ',' if ',' in tags_str else '&'
                for tag_pair in tags_str.split(separator):
                    if '=' in tag_pair:
                        key, value = tag_pair.strip().split('=', 1)
                        tags[key.strip()] = value.strip()
                
                # Extract stage information
                if 'stage' in tags:
                    try:
                        df.at[idx, 'stage'] = int(tags['stage'])
                    except ValueError:
                        df.at[idx, 'stage'] = 1
                
                if 'stage_name' in tags:
                    df.at[idx, 'stage_name'] = tags['stage_name']
                
                if 'api_type' in tags:
                    df.at[idx, 'api_type'] = tags['api_type']
        
        return df
    
    def _format_relative_time(self, seconds):
        """
        Format seconds into a readable time format.
        
        Args:
            seconds (float): Time in seconds
            
        Returns:
            str: Formatted time string (e.g., "0s", "30s", "1m 20s", "2h 15m")
        """
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            secs = int(seconds % 60)
            return f"{minutes}m {secs}s" if secs > 0 else f"{minutes}m"
        else:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
    
    def _determine_api_type_from_data(self, df):
        """
        Determine API type (REST or GraphQL) from the data itself.
        
        Args:
            df (pd.DataFrame): DataFrame with stage information
            
        Returns:
            str: 'REST' or 'GraphQL'
        """
        # Check if we have api_type column from tags
        if 'api_type' in df.columns and not df['api_type'].isna().all():
            api_types = df['api_type'].unique()
            # Return the most common API type
            from collections import Counter
            api_type_counts = Counter(api_types)
            most_common = api_type_counts.most_common(1)[0][0]
            return most_common.upper()
        
        # Check URLs for API type indicators
        if 'url' in df.columns and not df['url'].isna().all():
            urls = df['url'].dropna().astype(str)
            if any('/graphql' in url.lower() for url in urls):
                return 'GraphQL'
            elif any('/api/' in url.lower() for url in urls):
                return 'REST'
        
        # Default to REST if cannot determine
        return 'REST'
    
    def print_stage_summary(self, df):
        """
        Print a summary of detected stages from tags.
        
        Args:
            df (pd.DataFrame): DataFrame with stage information (filtered for http_req_duration)
        """
        if df.empty:
            return
        
        # Check if we have stage information
        if 'stage' not in df.columns or df['stage'].nunique() <= 1:
            print("\n=== No stage information found in tags ===")
            return
        
        print("\n=== Stage Analysis (from k6 tags) ===")
        
        # Calculate detailed statistics for each stage
        stage_stats = []
        for stage in sorted(df['stage'].unique()):
            stage_data = df[df['stage'] == stage]
            
            # Basic stats
            start_time = stage_data['timestamp'].min()
            end_time = stage_data['timestamp'].max()
            count = len(stage_data)
            mean_resp = stage_data['metric_value'].mean()
            min_resp = stage_data['metric_value'].min()
            max_resp = stage_data['metric_value'].max()
            
            # Percentiles
            p90 = stage_data['metric_value'].quantile(0.90)
            p95 = stage_data['metric_value'].quantile(0.95)
            
            # RPS calculation
            duration = (end_time - start_time).total_seconds()
            rps = count / duration if duration > 0 else 0
            
            stage_stats.append({
                'Stage': stage,
                'Start Time': start_time,
                'End Time': end_time,
                'Data Points': count,
                'Avg Response (ms)': round(mean_resp, 2),
                'Min Response (ms)': round(min_resp, 2),
                'Max Response (ms)': round(max_resp, 2),
                'P90 (ms)': round(p90, 2),
                'P95 (ms)': round(p95, 2),
                'RPS': round(rps, 2)
            })
        
        # Convert to DataFrame for nice formatting
        import pandas as pd
        stage_summary_df = pd.DataFrame(stage_stats)
        stage_summary_df = stage_summary_df.set_index('Stage')
        
        print(stage_summary_df)
        print(f"\nTotal stages detected: {df['stage'].nunique()}")
        print(f"Total test duration: {(df['timestamp'].max() - df['timestamp'].min()).total_seconds():.1f} seconds")
        
        # Show API type if available
        if 'api_type' in df.columns:
            api_types = df['api_type'].unique()
            print(f"API types: {', '.join(api_types)}")
    
    def create_response_time_chart(self, df, output_file=None):
        """
        Create a line chart for HTTP response times over time with stage information.
        
        Args:
            df (pd.DataFrame): Processed k6 data with stage information (already filtered for http_req_duration)
            output_file (str): Output file path (optional)
        """
        # Data is already filtered for http_req_duration in load_csv_data
        response_data = df
        
        if response_data.empty:
            print("No response duration data found")
            return
        
        plt.figure(figsize=(16, 10))
        
        # Check if we have stage information
        has_stages = 'stage' in response_data.columns and response_data['stage'].nunique() > 1
        
        if has_stages:
            # Plot by stages with different colors
            unique_stages = sorted(response_data['stage'].unique())
            colors = plt.cm.Set3(np.linspace(0, 1, len(unique_stages)))
            stage_colors = dict(zip(unique_stages, colors))
            
            for stage in unique_stages:
                stage_data = response_data[response_data['stage'] == stage]
                plt.plot(stage_data['timestamp'], stage_data['metric_value'], 
                        linewidth=2, alpha=0.7, color=stage_colors[stage],
                        label=f'Stage {stage}')
            
            # Add stage transition lines
            stage_transitions = response_data.groupby('stage')['timestamp'].min()
            for i, (stage, timestamp) in enumerate(stage_transitions.items()):
                if i > 0:  # Don't draw line for first stage
                    plt.axvline(x=timestamp, color='black', linestyle=':', alpha=0.7, linewidth=2)
            
            # Determine API type for title
            api_type = self._determine_api_type_from_data(response_data)
            plt.title(f'{api_type} - Response Time Over Time', fontsize=20, fontweight='bold')
            
            # Add stage statistics
            stage_info = []
            for stage in unique_stages:
                stage_data = response_data[response_data['stage'] == stage]
                stage_mean = stage_data['metric_value'].mean()
                stage_count = len(stage_data)
                
                # Calculate percentiles
                p90 = stage_data['metric_value'].quantile(0.90)
                p95 = stage_data['metric_value'].quantile(0.95)
                
                # Calculate RPS (Requests Per Second)
                stage_duration = (stage_data['timestamp'].max() - stage_data['timestamp'].min()).total_seconds()
                rps = stage_count / stage_duration if stage_duration > 0 else 0
                
                stage_info.append(f'Stage {stage}: AVG {stage_mean:.1f}ms, P90 {p90:.1f}ms, P95 {p95:.1f}ms, Requests {stage_count}, RPS {rps:.1f}')
            
            info_text = '\n'.join(stage_info)
            plt.text(0.02, 0.98, info_text, transform=plt.gca().transAxes, 
                    verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.25),
                    fontsize=14)
            
        else:
            # Plot without stage information
            plt.plot(response_data['timestamp'], response_data['metric_value'], 
                    linewidth=1, alpha=0.7, color='#2E86AB')
            # Determine API type for title
            api_type = self._determine_api_type_from_data(response_data)
            plt.title(f'{api_type} - Response Time Over Time', fontsize=20, fontweight='bold')
        
        plt.xlabel('Time', fontsize=18)
        plt.ylabel('Response Time (ms)', fontsize=18)
        
        # Convert timestamps to relative time for x-axis labels
        start_time = response_data['timestamp'].min()
        end_time = response_data['timestamp'].max()
        duration = (end_time - start_time).total_seconds()
        
        # Set appropriate number of ticks based on duration
        if duration <= 60:  # Less than 1 minute
            num_ticks = 7
        elif duration <= 300:  # Less than 5 minutes
            num_ticks = 8
        elif duration <= 1800:  # Less than 30 minutes
            num_ticks = 10
        else:  # More than 30 minutes
            num_ticks = 12
        
        # Create evenly spaced timestamps
        tick_timestamps = pd.date_range(start=start_time, end=end_time, periods=num_ticks)
        tick_relative_times = (tick_timestamps - start_time).total_seconds()
        
        # Format x-axis with relative time labels
        ax = plt.gca()
        ax.set_xticks(tick_timestamps)
        ax.set_xticklabels([self._format_relative_time(t) for t in tick_relative_times], rotation=45, fontsize=15)
        
        # Set y-axis tick labels to match x-axis font size
        ax.tick_params(axis='y', labelsize=15)
        
        # Add overall statistics
        mean_time = response_data['metric_value'].mean()
        max_time = response_data['metric_value'].max()
        min_time = response_data['metric_value'].min()
        
        plt.axhline(y=mean_time, color='black', linestyle='--', alpha=0.7, 
                   label=f'Overall Mean: {mean_time:.2f}ms')
        
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=15)
        plt.tight_layout()
        
        if output_file:
            plt.savefig(output_file, dpi=300, bbox_inches='tight')
            print(f"Chart saved to: {output_file}")
        else:
            plt.show()
    
    def generate_charts_from_file(self, csv_file, chart_type='response_time', output_dir='output'):
        """
        Generate charts from a specific CSV file.
        
        Args:
            csv_file (str): Path to CSV file
            chart_type (str): Type of chart to generate (default: 'response_time')
            output_dir (str): Directory to save output files
        """
        # Determine API type and set appropriate output directory
        api_type = self._determine_api_type(csv_file)
        final_output_dir = os.path.join(output_dir, api_type)
        
        # Create output directory if it doesn't exist
        os.makedirs(final_output_dir, exist_ok=True)
        
        # Load data
        df = self.load_csv_data(csv_file)
        if df is None:
            return
        
        # Print stage analysis
        self.print_stage_summary(df)
        
        # Get base filename for output files
        base_name = Path(csv_file).stem
        
        # Only generate response time chart
        if chart_type in ['response_time', 'all']:
            output_file = os.path.join(final_output_dir, f"{base_name}_response_time.png")
            self.create_response_time_chart(df, output_file)
    
    def _determine_api_type(self, csv_file):
        """
        Determine API type (REST or GraphQL) based on file path.
        
        Args:
            csv_file (str): Path to CSV file
            
        Returns:
            str: 'REST' or 'GraphQL'
        """
        csv_path = Path(csv_file)
        
        # Check if file is in REST or GraphQL subdirectory (case insensitive)
        path_parts_lower = [part.lower() for part in csv_path.parts]
        if 'rest' in path_parts_lower:
            return 'REST'
        elif 'graphql' in path_parts_lower:
            return 'GraphQL'
        
        # Check filename for API type indicators
        filename = csv_path.name.lower()
        if 'rest' in filename:
            return 'REST'
        elif 'graphql' in filename or 'graph' in filename:
            return 'GraphQL'
        
        # Default to REST if cannot determine
        return 'REST'
    
    def process_all_csv_files(self, chart_type='response_time', output_dir='output'):
        """
        Process all CSV files in the data directory and subdirectories.
        
        Args:
            chart_type (str): Type of chart to generate (default: 'response_time')
            output_dir (str): Directory to save output files
        """
        # Search for CSV files in data directory and subdirectories
        csv_files = []
        csv_files.extend(glob.glob(os.path.join(self.data_dir, "*.csv")))
        csv_files.extend(glob.glob(os.path.join(self.data_dir, "rest", "*.csv")))
        csv_files.extend(glob.glob(os.path.join(self.data_dir, "graphql", "*.csv")))
        
        if not csv_files:
            print(f"No CSV files found in {self.data_dir} or its subdirectories")
            return
        
        print(f"Found {len(csv_files)} CSV files to process")
        
        for csv_file in csv_files:
            print(f"Processing: {csv_file}")
            self.generate_charts_from_file(csv_file, chart_type, output_dir)


def main():
    """Main function to handle command line arguments."""
    parser = argparse.ArgumentParser(description='Generate response time charts from k6 CSV data')
    parser.add_argument('--data-dir', default='data', 
                       help='Directory containing CSV files (default: data)')
    parser.add_argument('--output-dir', default='output', 
                       help='Directory to save output charts (default: output)')
    parser.add_argument('--chart-type', default='response_time', 
                       choices=['response_time'],
                       help='Type of chart to generate (default: response_time)')
    parser.add_argument('--file', 
                       help='Specific CSV file to process (optional)')
    
    args = parser.parse_args()
    
    # Initialize chart generator
    generator = K6ChartGenerator(args.data_dir)
    
    if args.file:
        # Process specific file
        generator.generate_charts_from_file(args.file, args.chart_type, args.output_dir)
    else:
        # Process all files in data directory and subdirectories
        generator.process_all_csv_files(args.chart_type, args.output_dir)


if __name__ == "__main__":
    main()
