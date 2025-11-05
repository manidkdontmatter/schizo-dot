import ApexCharts from 'apexcharts';

export default async function renderChart(elementId) {
  try {
    const response = await fetch('/api/chart-data');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Assuming data structure: { series: [{ name: 'Series Name', data: [[timestamp, value], ...] }] }
    const series = data.series.map(s => ({
      ...s,
      dropShadow: {
        enabled: true,
        top: 0,
        left: 0,
        blur: 3,
        opacity: 0.5
      }
    }));
    const options = {
      chart: {
        type: 'line',
        height: 350,
        background: 'transparent',
        toolbar: {
          show: false
        }
      },
      series: series,
      xaxis: {
        type: 'datetime'
      },
      theme: {
        mode: 'dark'
      },
      foreColor: '#ffffff',
      colors: ['#8b5cf6', '#a855f7', '#c084fc'],
      grid: {
        borderColor: '#374151',
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: false
          }
        }
      }
    };

    const chartElement = document.querySelector('#' + elementId);
    if (chartElement) {
      const chart = new ApexCharts(chartElement, options);
      chart.render();
    } else {
      console.error('Chart element with id "' + elementId + '" not found');
    }
  } catch (error) {
    console.error('Error rendering chart:', error);
    const chartElement = document.querySelector('#' + elementId);
    if (chartElement) {
      chartElement.innerHTML = '<p>Error loading chart data</p>';
    }
  }
}