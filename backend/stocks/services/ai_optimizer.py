"""
AI Optimizer Service for Stock Breakout Alert System.

Uses Claude AI to analyze backtest results and suggest improvements
to the detection algorithms and parameters.
"""

import os
import json
import logging
from typing import Optional
from django.conf import settings
from anthropic import Anthropic

from .backtest_service import BacktestService

logger = logging.getLogger(__name__)


class AIOptimizer:
    """Service to analyze backtest data with AI and suggest optimizations."""

    def __init__(self):
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set - AI optimization disabled")
            self.client = None
        else:
            self.client = Anthropic(api_key=api_key)

        self.backtest_service = BacktestService()

    def analyze_and_optimize(self, days_back: int = 90) -> dict:
        """
        Analyze backtest data and generate AI-powered optimization recommendations.
        """
        if not self.client:
            return {
                'error': 'AI optimization unavailable - ANTHROPIC_API_KEY not configured',
                'recommendations': [],
            }

        # Gather comprehensive backtest data
        alert_performance = self.backtest_service.analyze_alert_performance(days_back)
        pattern_analysis = self.backtest_service.analyze_consolidation_patterns(days_back)

        # Get current configuration
        current_config = {
            'atr_period': getattr(settings, 'ATR_PERIOD', 14),
            'consolidation_threshold_days': getattr(settings, 'CONSOLIDATION_THRESHOLD_DAYS', 3),
            'volume_spike_multiplier': getattr(settings, 'VOLUME_SPIKE_MULTIPLIER', 1.5),
            'volume_avg_period': getattr(settings, 'VOLUME_AVG_PERIOD', 20),
            'breakout_threshold_pct': 2.0,  # From backtest service
        }

        # Prepare the analysis prompt
        analysis_data = self._prepare_analysis_data(
            alert_performance,
            pattern_analysis,
            current_config
        )

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": self._build_analysis_prompt(analysis_data)
                    }
                ]
            )

            ai_analysis = response.content[0].text

            # Parse the AI response into structured recommendations
            recommendations = self._parse_ai_response(ai_analysis)

            return {
                'success': True,
                'period_days': days_back,
                'current_config': current_config,
                'performance_summary': {
                    'alert_win_rate': alert_performance['summary']['win_rate'],
                    'pattern_accuracy': pattern_analysis['summary']['overall_accuracy'],
                    'high_prob_accuracy': pattern_analysis['summary']['high_prob_accuracy'],
                    'total_alerts': alert_performance['total_alerts'],
                    'total_patterns': pattern_analysis['total_patterns'],
                    'avg_gain': alert_performance['summary']['avg_gain_pct'],
                    'avg_loss': alert_performance['summary']['avg_loss_pct'],
                },
                'ai_analysis': ai_analysis,
                'recommendations': recommendations,
                'raw_data': {
                    'by_probability': pattern_analysis['by_probability'],
                    'by_tight_days': pattern_analysis['by_tight_days'],
                    'by_alert_type': alert_performance['by_type'],
                }
            }

        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return {
                'error': f'AI analysis failed: {str(e)}',
                'recommendations': [],
            }

    def _prepare_analysis_data(self, alert_perf: dict, pattern_analysis: dict, config: dict) -> dict:
        """Prepare a structured summary of the data for AI analysis."""
        return {
            'current_parameters': config,
            'alert_performance': {
                'total_alerts': alert_perf['total_alerts'],
                'win_rate': alert_perf['summary']['win_rate'],
                'breakouts': alert_perf['summary']['total_breakouts'],
                'non_breakouts': alert_perf['summary']['total_non_breakouts'],
                'avg_gain_on_win': alert_perf['summary']['avg_gain_pct'],
                'avg_loss_on_loss': alert_perf['summary']['avg_loss_pct'],
                'best_gain': alert_perf['summary']['best_gain_pct'],
                'worst_loss': alert_perf['summary']['worst_loss_pct'],
                'by_type': alert_perf['by_type'],
                'by_stock': alert_perf['by_stock'],
            },
            'pattern_analysis': {
                'total_patterns': pattern_analysis['total_patterns'],
                'overall_accuracy': pattern_analysis['summary']['overall_accuracy'],
                'avg_days_to_breakout': pattern_analysis['summary']['avg_days_to_breakout'],
                'by_probability': pattern_analysis['by_probability'],
                'by_consecutive_tight_days': pattern_analysis['by_tight_days'],
            }
        }

    def _build_analysis_prompt(self, data: dict) -> str:
        """Build the prompt for AI analysis."""
        return f"""You are an expert quantitative analyst helping optimize a stock breakout detection system.

## Current System Configuration
- ATR Period: {data['current_parameters']['atr_period']} days
- Consolidation Threshold: {data['current_parameters']['consolidation_threshold_days']} consecutive tight days
- Volume Spike Multiplier: {data['current_parameters']['volume_spike_multiplier']}x average volume
- Volume Average Period: {data['current_parameters']['volume_avg_period']} days
- Breakout Threshold: {data['current_parameters']['breakout_threshold_pct']}% price move

## Alert Performance Data
{json.dumps(data['alert_performance'], indent=2)}

## Consolidation Pattern Analysis
{json.dumps(data['pattern_analysis'], indent=2)}

## Your Task
Analyze this backtest data and provide specific, actionable recommendations to improve the system's accuracy. Focus on:

1. **Parameter Tuning**: Should any thresholds be adjusted? (tight days, volume multiplier, ATR period, etc.)

2. **Pattern Recognition**: Which patterns (tight days count, probability levels) are most predictive? Should we weight them differently?

3. **Alert Type Effectiveness**: Which alert types perform best? Should we modify when alerts are triggered?

4. **Stock-Specific Insights**: Are there patterns in which stocks perform better/worse?

5. **Confidence Score Formula**: The current score is based on tight days (max 40 pts), volume ratio (max 30 pts), and range tightness (max 30 pts). Should the weighting change?

6. **Risk Management**: Based on the loss data, what stop-loss or position sizing rules would you suggest?

Please provide your analysis in this format:

### PERFORMANCE ASSESSMENT
[Brief assessment of current system performance]

### KEY FINDINGS
[3-5 bullet points of important patterns in the data]

### PARAMETER RECOMMENDATIONS
[Specific parameter changes with reasoning]

### FORMULA IMPROVEMENTS
[Suggested changes to the scoring/detection algorithms]

### ADDITIONAL SUGGESTIONS
[Any other improvements]

### PRIORITY ACTIONS
[Top 3 changes to implement first, ordered by expected impact]

Be specific with numbers and thresholds. If the data is insufficient to make certain recommendations, say so."""

    def _parse_ai_response(self, response: str) -> list:
        """Parse the AI response into structured recommendations."""
        recommendations = []

        sections = {
            'PERFORMANCE ASSESSMENT': 'assessment',
            'KEY FINDINGS': 'findings',
            'PARAMETER RECOMMENDATIONS': 'parameters',
            'FORMULA IMPROVEMENTS': 'formulas',
            'ADDITIONAL SUGGESTIONS': 'additional',
            'PRIORITY ACTIONS': 'priorities'
        }

        current_section = None
        current_content = []

        for line in response.split('\n'):
            # Check if this is a section header
            header_found = False
            for header, key in sections.items():
                if header in line.upper():
                    # Save previous section
                    if current_section and current_content:
                        recommendations.append({
                            'category': current_section,
                            'content': '\n'.join(current_content).strip()
                        })
                    current_section = key
                    current_content = []
                    header_found = True
                    break

            if not header_found and current_section:
                current_content.append(line)

        # Don't forget the last section
        if current_section and current_content:
            recommendations.append({
                'category': current_section,
                'content': '\n'.join(current_content).strip()
            })

        return recommendations

    def get_quick_insights(self, days_back: int = 30) -> dict:
        """
        Get quick AI insights without full analysis.
        Uses less tokens for faster, cheaper responses.
        """
        if not self.client:
            return {
                'error': 'AI unavailable - ANTHROPIC_API_KEY not configured',
                'insights': [],
            }

        pattern_analysis = self.backtest_service.analyze_consolidation_patterns(days_back)

        # Build a concise prompt
        prompt = f"""Based on this stock pattern data from the last {days_back} days:

- Overall accuracy: {pattern_analysis['summary']['overall_accuracy']}%
- HIGH probability accuracy: {pattern_analysis['by_probability']['HIGH']['accuracy']}% ({pattern_analysis['by_probability']['HIGH']['total']} patterns)
- MEDIUM probability accuracy: {pattern_analysis['by_probability']['MEDIUM']['accuracy']}% ({pattern_analysis['by_probability']['MEDIUM']['total']} patterns)
- LOW probability accuracy: {pattern_analysis['by_probability']['LOW']['accuracy']}% ({pattern_analysis['by_probability']['LOW']['total']} patterns)
- Performance by tight days: {json.dumps(pattern_analysis['by_tight_days'])}

Give me 3 quick, specific insights about this performance data. Be concise (1-2 sentences each)."""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            return {
                'success': True,
                'insights': response.content[0].text,
                'data_summary': {
                    'overall_accuracy': pattern_analysis['summary']['overall_accuracy'],
                    'high_prob_accuracy': pattern_analysis['by_probability']['HIGH']['accuracy'],
                    'total_patterns': pattern_analysis['total_patterns'],
                }
            }
        except Exception as e:
            logger.error(f"Quick insights failed: {e}")
            return {'error': str(e), 'insights': []}

    def suggest_parameter_changes(self) -> dict:
        """
        Analyze current performance and suggest specific parameter changes.
        Returns machine-readable suggestions that could be auto-applied.
        """
        if not self.client:
            return {'error': 'AI unavailable', 'suggestions': []}

        pattern_analysis = self.backtest_service.analyze_consolidation_patterns(90)

        suggestions = []

        # Analyze tight days performance
        by_tight_days = pattern_analysis['by_tight_days']
        if by_tight_days:
            best_tight_days = max(
                by_tight_days.items(),
                key=lambda x: (x[1]['accuracy'], x[1]['total']),
                default=(None, None)
            )
            if best_tight_days[0]:
                current_threshold = getattr(settings, 'CONSOLIDATION_THRESHOLD_DAYS', 3)
                optimal = int(best_tight_days[0])
                if optimal != current_threshold and best_tight_days[1]['total'] >= 5:
                    suggestions.append({
                        'parameter': 'CONSOLIDATION_THRESHOLD_DAYS',
                        'current_value': current_threshold,
                        'suggested_value': optimal,
                        'reason': f"Patterns with {optimal} tight days show {best_tight_days[1]['accuracy']}% accuracy vs current threshold of {current_threshold}",
                        'confidence': 'medium' if best_tight_days[1]['total'] >= 10 else 'low'
                    })

        # Analyze probability level performance
        by_prob = pattern_analysis['by_probability']
        high_acc = by_prob['HIGH']['accuracy']
        med_acc = by_prob['MEDIUM']['accuracy']

        if high_acc < med_acc and by_prob['HIGH']['total'] >= 5 and by_prob['MEDIUM']['total'] >= 5:
            suggestions.append({
                'parameter': 'PROBABILITY_SCORING',
                'current_value': 'Current formula',
                'suggested_value': 'Adjust HIGH threshold',
                'reason': f"MEDIUM probability ({med_acc}%) outperforming HIGH ({high_acc}%). Consider adjusting what triggers HIGH probability.",
                'confidence': 'medium'
            })

        return {
            'success': True,
            'suggestions': suggestions,
            'data_points_analyzed': pattern_analysis['total_patterns'],
        }
