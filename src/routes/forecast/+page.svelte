<script>
	import { generateClient } from 'aws-amplify/data';
	import '$lib/amplify';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import AdminPanel from '$lib/components/AdminPanel.svelte';
	
	Chart.register(...registerables);

	const client = generateClient();
	
	let showAdminWindow = $state(false);
	let selectedYear = $state(2025);
	let plusValue = $state('1');

	// Teammates data (loaded from AdminPanel)
	let teammates = $state([]);
	let isLoadingTeammates = $state(false);

	// AdminPanel reference
	let adminPanelRef;

	// Initialize Bootstrap tooltips
	function initTooltips() {
		if (!browser || typeof window.bootstrap === 'undefined') return;
		
		// Destroy existing tooltips first
		const existingTooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
		existingTooltips.forEach(el => {
			const tooltipInstance = window.bootstrap.Tooltip.getInstance(el);
			if (tooltipInstance) {
				tooltipInstance.dispose();
			}
		});
		
		// Initialize new tooltips
		const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
		tooltipTriggerList.forEach(tooltipTriggerEl => {
			new window.bootstrap.Tooltip(tooltipTriggerEl);
		});
	}

	// Load on mount
	onMount(() => {
		loadTeammates();
		loadForecastData();
		
		// Initialize Bootstrap tooltips after DOM is ready
		if (browser) {
			setTimeout(() => {
				initTooltips();
				// Charts will be lazy-loaded when they become visible via $effect
			}, 200);
		}
	});

	// Lazy load charts: Only initialize when they become visible
	$effect(() => {
		if (!browser) return;
		
		// Track visibility changes
		const currentVisibleChart = visibleChart;
		
		// Track dependencies for reactivity
		selectedYear;
		forecastData;
		teammates;
		plusValue;
		
		// Destroy and cleanup charts when they become hidden
		if (currentVisibleChart !== 'total' && chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
			// Clear canvas reference when chart is hidden (canvas removed from DOM)
			if (chartCanvas) {
				chartCanvas = null;
			}
		}
		if (currentVisibleChart !== 'opexcapex' && opexCapexChartInstance) {
			opexCapexChartInstance.destroy();
			opexCapexChartInstance = null;
			// Clear canvas reference when chart is hidden (canvas removed from DOM)
			if (opexCapexChartCanvas) {
				opexCapexChartCanvas = null;
			}
		}
		if (currentVisibleChart !== 'contract' && contractChartInstance) {
			contractChartInstance.destroy();
			contractChartInstance = null;
			// Clear canvas reference when chart is hidden (canvas removed from DOM)
			if (contractChartCanvas) {
				contractChartCanvas = null;
			}
		}
		
		// Lazy load total forecast chart only when visible and canvas is available
		if (currentVisibleChart === 'total' && chartCanvas && teammates.length > 0) {
			// Use requestAnimationFrame to ensure canvas is fully rendered in DOM
			requestAnimationFrame(() => {
				// Double-check canvas is still available and visible before initializing
				if (chartCanvas && visibleChart === 'total' && chartCanvas.isConnected) {
					updateChart();
				}
			});
		}
		
		// Lazy load OPEX/CAPEX chart only when visible and canvas is available
		if (currentVisibleChart === 'opexcapex' && opexCapexChartCanvas && teammates.length > 0) {
			// Use requestAnimationFrame to ensure canvas is fully rendered in DOM
			requestAnimationFrame(() => {
				// Double-check canvas is still available and visible before initializing
				if (opexCapexChartCanvas && visibleChart === 'opexcapex' && opexCapexChartCanvas.isConnected) {
					updateOpexCapexChart();
				}
			});
		}
		
		// Lazy load contract chart only when visible and canvas is available
		if (currentVisibleChart === 'contract' && contractChartCanvas && teammates.length > 0) {
			// Use requestAnimationFrame to ensure canvas is fully rendered in DOM
			requestAnimationFrame(() => {
				// Double-check canvas is still available and visible before initializing
				if (contractChartCanvas && visibleChart === 'contract' && contractChartCanvas.isConnected) {
					updateContractChart();
				}
			});
		}
	});

	// Reload forecast data when year changes
	$effect(() => {
		if (browser && selectedYear) {
			loadForecastData();
		}
	});

	// Re-initialize tooltips when teammates data changes
	$effect(() => {
		if (browser && teammates.length > 0) {
			setTimeout(() => {
				initTooltips();
			}, 100);
		}
	});

	function toggleAdminWindow() {
		showAdminWindow = !showAdminWindow;
	}

	// Load teammates from AdminPanel
	async function loadTeammates() {
		if (!browser) return;
		
		if (!client.models.Teammate) {
			console.warn('Teammate model not found. Schema may need to be deployed.');
			isLoadingTeammates = false;
			return;
		}
		
		isLoadingTeammates = true;
		try {
			const result = await client.models.Teammate.list();
			teammates = result.data || [];
		} catch (error) {
			console.error('Error loading teammates:', error);
			teammates = [];
		} finally {
			isLoadingTeammates = false;
		}
	}

	// Handle teammates change from AdminPanel
	function handleTeammatesChange(newTeammates) {
		teammates = newTeammates;
	}
	
	// Expanded rows for forecast data entry
	let expandedRows = $state(new Set());
	let forecastData = $state({}); // Structure: { teammateId_year: { month: value } }


	function toggleRow(teammateId) {
		if (expandedRows.has(teammateId)) {
			expandedRows.delete(teammateId);
		} else {
			expandedRows.add(teammateId);
		}
		expandedRows = new Set(expandedRows); // Trigger reactivity
	}

	function getForecastValue(teammateId, month) {
		const key = `${teammateId}_${selectedYear}`;
		return forecastData[key]?.[month] || '';
	}

	function calculateCellValue(teammate, month) {
		const forecastValue = getForecastValue(teammate.id, month);
		if (!forecastValue || forecastValue === '') {
			return '';
		}
		const numValue = parseFloat(forecastValue);
		if (isNaN(numValue)) {
			return '';
		}
		const baseRate = teammate.baseRate || 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		const result = baseRate * numValue * 173.33 * plusMultiplier;
		return Math.round(result).toLocaleString('en-US');
	}

	function calculateColumnTotal(month) {
		if (!teammates || teammates.length === 0) {
			return '';
		}
		let total = 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		teammates.forEach(teammate => {
			if (!teammate || !teammate.id) return;
			const forecastValue = getForecastValue(teammate.id, month);
			if (forecastValue && forecastValue !== '') {
				const numValue = parseFloat(forecastValue);
				if (!isNaN(numValue)) {
					const baseRate = teammate.baseRate || 0;
					total += baseRate * numValue * 173.33 * plusMultiplier;
				}
			}
		});
		return Math.round(total).toLocaleString('en-US');
	}

	function calculateGrandTotal() {
		if (!teammates || teammates.length === 0) {
			return 0;
		}
		let grandTotal = 0;
		months.forEach(month => {
			const monthTotal = getColumnTotalNumeric(month);
			grandTotal += monthTotal;
		});
		return grandTotal;
	}

	function getColumnTotalNumeric(month) {
		if (!teammates || teammates.length === 0) {
			return 0;
		}
		let total = 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		teammates.forEach(teammate => {
			if (!teammate || !teammate.id) return;
			const forecastValue = getForecastValue(teammate.id, month);
			if (forecastValue && forecastValue !== '') {
				const numValue = parseFloat(forecastValue);
				if (!isNaN(numValue)) {
					const baseRate = teammate.baseRate || 0;
					total += baseRate * numValue * 173.33 * plusMultiplier;
				}
			}
		});
		return Math.round(total);
	}

	// Chart instances
	let chartCanvas = $state(null);
	let chartInstance = null;
	let opexCapexChartCanvas = $state(null);
	let opexCapexChartInstance = null;
	let contractChartCanvas = $state(null);
	let contractChartInstance = null;
	const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

	// Chart visibility - only one chart visible at a time
	let visibleChart = $state('dataonly'); // 'dataonly', 'total', 'opexcapex', or 'contract'

	// Categorize expense types as OPEX or CAPEX
	// This can be customized based on your expense type naming
	function isOpex(expenseType) {
		if (!expenseType) return true; // Default to OPEX if not specified
		const opexKeywords = ['opex', 'operating', 'operational', 'expense', 'maintenance', 'support'];
		const lowerExpenseType = expenseType.toLowerCase();
		return opexKeywords.some(keyword => lowerExpenseType.includes(keyword));
	}

	function getOpexTotalNumeric(month) {
		if (!teammates || teammates.length === 0) {
			return 0;
		}
		let total = 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		teammates.forEach(teammate => {
			if (!teammate || !teammate.id) return;
			const forecastValue = getForecastValue(teammate.id, month);
			if (forecastValue && forecastValue !== '') {
				const numValue = parseFloat(forecastValue);
				if (!isNaN(numValue)) {
					// Check if teammate has any OPEX expense types
					const hasOpex = teammate.expenseTypes && teammate.expenseTypes.length > 0 
						? teammate.expenseTypes.some(et => isOpex(et))
						: true; // Default to OPEX if no expense types specified
					
					if (hasOpex) {
						const baseRate = teammate.baseRate || 0;
						total += baseRate * numValue * 173.33 * plusMultiplier;
					}
				}
			}
		});
		return Math.round(total);
	}

	function getCapexTotalNumeric(month) {
		if (!teammates || teammates.length === 0) {
			return 0;
		}
		let total = 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		teammates.forEach(teammate => {
			if (!teammate || !teammate.id) return;
			const forecastValue = getForecastValue(teammate.id, month);
			if (forecastValue && forecastValue !== '') {
				const numValue = parseFloat(forecastValue);
				if (!isNaN(numValue)) {
					// Check if teammate has any CAPEX expense types
					const hasCapex = teammate.expenseTypes && teammate.expenseTypes.length > 0 
						? teammate.expenseTypes.some(et => !isOpex(et))
						: false; // Default to not CAPEX if no expense types specified
					
					if (hasCapex) {
						const baseRate = teammate.baseRate || 0;
						total += baseRate * numValue * 173.33 * plusMultiplier;
					}
				}
			}
		});
		return Math.round(total);
	}

	// Get all unique contracts from teammates
	function getAllContracts() {
		const contractSet = new Set();
		teammates.forEach(teammate => {
			if (teammate.contracts && teammate.contracts.length > 0) {
				teammate.contracts.forEach(contract => {
					if (contract) contractSet.add(contract);
				});
			} else {
				// If no contracts specified, use "Unassigned"
				contractSet.add('Unassigned');
			}
		});
		return Array.from(contractSet).sort();
	}

	// Get spend for a specific contract in a specific month
	function getContractSpendNumeric(contract, month) {
		if (!teammates || teammates.length === 0) {
			return 0;
		}
		let total = 0;
		const plusMultiplier = parseFloat(plusValue) || 1;
		teammates.forEach(teammate => {
			if (!teammate || !teammate.id) return;
			
			// Check if teammate belongs to this contract
			const teammateContracts = teammate.contracts && teammate.contracts.length > 0 
				? teammate.contracts 
				: ['Unassigned'];
			
			if (teammateContracts.includes(contract)) {
				const forecastValue = getForecastValue(teammate.id, month);
				if (forecastValue && forecastValue !== '') {
					const numValue = parseFloat(forecastValue);
					if (!isNaN(numValue)) {
						const baseRate = teammate.baseRate || 0;
						total += baseRate * numValue * 173.33 * plusMultiplier;
					}
				}
			}
		});
		return Math.round(total);
	}

	// Get chart data for contracts (returns array of datasets, one per contract)
	function getContractChartData() {
		const contracts = getAllContracts();
		const colorPalette = [
			'rgb(75, 192, 192)',
			'rgb(54, 162, 235)',
			'rgb(255, 99, 132)',
			'rgb(255, 206, 86)',
			'rgb(153, 102, 255)',
			'rgb(255, 159, 64)',
			'rgb(199, 199, 199)',
			'rgb(83, 102, 255)',
			'rgb(255, 99, 255)',
			'rgb(99, 255, 132)',
			'rgb(255, 132, 99)',
			'rgb(132, 99, 255)'
		];
		
		return contracts.map((contract, index) => {
			const data = months.map(month => getContractSpendNumeric(contract, month));
			const color = colorPalette[index % colorPalette.length];
			return {
				label: contract,
				data: data,
				borderColor: color,
				backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
				fill: true,
				tension: 0.4
			};
		});
	}

	function getChartData() {
		return months.map(month => getColumnTotalNumeric(month));
	}

	function updateChart() {
		if (!chartCanvas || !browser) return;
		
		const data = getChartData();
		
		if (chartInstance) {
			chartInstance.data.datasets[0].data = data;
			chartInstance.update();
		} else {
			const ctx = chartCanvas.getContext('2d');
			chartInstance = new Chart(ctx, {
				type: 'line',
				data: {
					labels: months,
					datasets: [{
						label: 'Total Forecast',
						data: data,
						borderColor: 'rgb(75, 192, 192)',
						backgroundColor: 'rgba(75, 192, 192, 0.2)',
						fill: true,
						tension: 0.4
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: true,
							position: 'top'
						},
						tooltip: {
							callbacks: {
								label: function(context) {
									return '$' + context.parsed.y.toLocaleString('en-US');
								}
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: function(value) {
									return '$' + value.toLocaleString('en-US');
								}
							}
						}
					}
				}
			});
		}
	}

	function updateOpexCapexChart() {
		if (!opexCapexChartCanvas || !browser) return;
		
		const opexData = months.map(month => getOpexTotalNumeric(month));
		const capexData = months.map(month => getCapexTotalNumeric(month));
		
		if (opexCapexChartInstance) {
			opexCapexChartInstance.data.datasets[0].data = opexData;
			opexCapexChartInstance.data.datasets[1].data = capexData;
			opexCapexChartInstance.update();
		} else {
			const ctx = opexCapexChartCanvas.getContext('2d');
			opexCapexChartInstance = new Chart(ctx, {
				type: 'line',
				data: {
					labels: months,
					datasets: [
						{
							label: 'OPEX',
							data: opexData,
							borderColor: 'rgb(54, 162, 235)',
							backgroundColor: 'rgba(54, 162, 235, 0.2)',
							fill: true,
							tension: 0.4
						},
						{
							label: 'CAPEX',
							data: capexData,
							borderColor: 'rgb(255, 99, 132)',
							backgroundColor: 'rgba(255, 99, 132, 0.2)',
							fill: true,
							tension: 0.4
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: true,
							position: 'top'
						},
						tooltip: {
							callbacks: {
								label: function(context) {
									return context.dataset.label + ': $' + context.parsed.y.toLocaleString('en-US');
								}
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: function(value) {
									return '$' + value.toLocaleString('en-US');
								}
							}
						}
					}
				}
			});
		}
	}

	function updateContractChart() {
		if (!contractChartCanvas || !browser) return;
		
		const datasets = getContractChartData();
		
		if (contractChartInstance) {
			// Update existing chart
			contractChartInstance.data.datasets = datasets;
			contractChartInstance.update();
		} else {
			const ctx = contractChartCanvas.getContext('2d');
			contractChartInstance = new Chart(ctx, {
				type: 'line',
				data: {
					labels: months,
					datasets: datasets
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: true,
							position: 'top'
						},
						tooltip: {
							callbacks: {
								label: function(context) {
									return context.dataset.label + ': $' + context.parsed.y.toLocaleString('en-US');
								}
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: function(value) {
									return '$' + value.toLocaleString('en-US');
								}
							}
						}
					}
				}
			});
		}
	}

	async function setForecastValue(teammateId, month, value) {
		const key = `${teammateId}_${selectedYear}`;
		if (!forecastData[key]) {
			forecastData[key] = {};
		}
		forecastData[key][month] = value;
		forecastData = { ...forecastData }; // Trigger reactivity
		
		// Save to database
		await saveForecastValue(teammateId, month, value);
	}

	// Load forecast data from database
	async function loadForecastData() {
		if (!browser) return;
		
		if (!client.models.Forecast) {
			console.warn('Forecast model not found. Schema may need to be deployed.');
			return;
		}
		
		try {
			const result = await client.models.Forecast.list();
			// Organize data by teammateId_year -> month -> value
			const organized = {};
			result.data?.forEach(forecast => {
				const key = `${forecast.teammateId}_${forecast.year}`;
				if (!organized[key]) {
					organized[key] = {};
				}
				organized[key][forecast.month] = forecast.value?.toString() || '';
			});
			forecastData = organized;
		} catch (error) {
			console.error('Error loading forecast data:', error);
		}
	}

	// Save forecast value to database
	async function saveForecastValue(teammateId, month, value) {
		if (!browser) return;
		
		if (!client.models.Forecast) {
			console.warn('Forecast model not available. Schema may need to be deployed.');
			return;
		}

		try {
			// Check if a record already exists for this teammate/year/month
			const existing = await client.models.Forecast.list({
				filter: {
					teammateId: { eq: teammateId },
					year: { eq: selectedYear },
					month: { eq: month }
				}
			});

			const numValue = value ? parseFloat(value) : null;

			if (existing.data && existing.data.length > 0) {
				// Update existing record
				const record = existing.data[0];
				if (numValue === null || isNaN(numValue)) {
					// Delete if value is empty
					await client.models.Forecast.delete({ id: record.id });
				} else {
					await client.models.Forecast.update({
						id: record.id,
						value: numValue
					});
				}
			} else if (numValue !== null && !isNaN(numValue)) {
				// Create new record
				await client.models.Forecast.create({
					teammateId: teammateId,
					year: selectedYear,
					month: month,
					value: numValue
				});
			}
		} catch (error) {
			console.error('Error saving forecast value:', error);
		}
	}

	// Handle groupings change from AdminPanel (for future use if needed)
	function handleGroupingsChange(groupings) {
		// Groupings changed, but we don't need to do anything here
		// The AdminPanel manages groupings internally
	}
</script>

<style>
	.forecast-table th,
	.forecast-table td {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>

<div class="container mt-5">
	<div class="row justify-content-center">
		<div class="col-md-12">
			<div class="card">
				<div class="card-header d-flex justify-content-between align-items-center">
					<h1 class="card-title mb-0">
						<i class="bi bi-graph-up text-success me-2"></i>
						Forecast
					</h1>
					<button 
						class="btn btn-outline-secondary btn-sm" 
						onclick={toggleAdminWindow}
						type="button"
					>
						<i class="bi bi-gear me-1"></i>
						Admin
					</button>
				</div>
				<div class="card-body">
					<div class="d-flex justify-content-between align-items-center mb-3">
						<h5 class="mb-0">
							<i class="bi bi-people me-2"></i>
							Teammates
						</h5>
						<div class="d-flex align-items-center gap-2">
							<label for="year-select" class="form-label mb-0 small">Year:</label>
							<select 
								id="year-select"
								class="form-select form-select-sm" 
								style="width: auto;"
								bind:value={selectedYear}
							>
								<option value={2025}>2025</option>
								<option value={2026}>2026</option>
								<option value={2027}>2027</option>
								<option value={2028}>2028</option>
								<option value={2029}>2029</option>
								<option value={2030}>2030</option>
							</select>
							<label for="plus-input" class="form-label mb-0 small">+</label>
							<input
								id="plus-input"
								type="text"
								class="form-control form-control-sm"
								style="width: 60px;"
								placeholder="0"
								bind:value={plusValue}
							/>
						</div>
					</div>
					
					{#if isLoadingTeammates}
						<div class="text-center py-3">
							<div class="spinner-border spinner-border-sm text-primary" role="status">
								<span class="visually-hidden">Loading...</span>
							</div>
						</div>
					{:else if teammates.length === 0}
						<p class="text-muted">No teammates found. Add teammates in the admin panel.</p>
					{:else}
						<!-- Chart Visibility Toggle -->
						<div class="mb-3 d-flex justify-content-between align-items-center">
							<div class="btn-group" role="group" aria-label="Chart visibility toggle">
								<button
									type="button"
									class="btn btn-sm {visibleChart === 'dataonly' ? 'btn-secondary' : 'btn-outline-secondary'}"
									onclick={() => visibleChart = 'dataonly'}
									aria-pressed={visibleChart === 'dataonly'}
								>
									<i class="bi bi-table me-1"></i>
									Data Only
								</button>
								<button
									type="button"
									class="btn btn-sm {visibleChart === 'total' ? 'btn-secondary' : 'btn-outline-secondary'}"
									onclick={() => visibleChart = 'total'}
									aria-pressed={visibleChart === 'total'}
								>
									<i class="bi bi-graph-up-arrow me-1"></i>
									Total Forecast
								</button>
								<button
									type="button"
									class="btn btn-sm {visibleChart === 'opexcapex' ? 'btn-secondary' : 'btn-outline-secondary'}"
									onclick={() => visibleChart = 'opexcapex'}
									aria-pressed={visibleChart === 'opexcapex'}
								>
									<i class="bi bi-graph-up me-1"></i>
									OPEX/CAPEX
								</button>
								<button
									type="button"
									class="btn btn-sm {visibleChart === 'contract' ? 'btn-secondary' : 'btn-outline-secondary'}"
									onclick={() => visibleChart = 'contract'}
									aria-pressed={visibleChart === 'contract'}
								>
									<i class="bi bi-file-earmark-text me-1"></i>
									By Contract
								</button>
							</div>
							<div class="text-end">
								<strong class="small text-muted">Grand Total: </strong>
								<span class="fw-bold">${calculateGrandTotal().toLocaleString('en-US')}</span>
							</div>
						</div>

						<!-- Total Forecast Area Chart -->
						{#if visibleChart === 'total'}
							<div class="mb-4" style="height: 300px;">
								<canvas bind:this={chartCanvas}></canvas>
							</div>
						{/if}

						<!-- OPEX/CAPEX Area Chart -->
						{#if visibleChart === 'opexcapex'}
							<div class="mb-4" style="height: 300px;">
								<canvas bind:this={opexCapexChartCanvas}></canvas>
							</div>
						{/if}

						<!-- Contract Area Chart -->
						{#if visibleChart === 'contract'}
							<div class="mb-4" style="height: 300px;">
								<canvas bind:this={contractChartCanvas}></canvas>
							</div>
						{/if}
						
						<div class="table-responsive">
							<table class="table table-sm table-hover table-bordered forecast-table small text-muted">
								<thead>
									<tr class="table-light">
										<th class="text-end">{selectedYear}</th>
										<th class="text-end">JAN</th>
										<th class="text-end">FEB</th>
										<th class="text-end">MAR</th>
										<th class="text-end">APR</th>
										<th class="text-end">MAY</th>
										<th class="text-end">JUN</th>
										<th class="text-end">JUL</th>
										<th class="text-end">AUG</th>
										<th class="text-end">SEP</th>
										<th class="text-end">OCT</th>
										<th class="text-end">NOV</th>
										<th class="text-end">DEC</th>
									</tr>
								</thead>
								<tbody>
									{#each teammates as teammate}
										{@const tooltipContent = `
											<div style="text-align: left;">
												<div><strong>Contract:</strong> ${teammate.contracts?.join(', ') || 'None'}</div>
												<div><strong>Expense Type:</strong> ${teammate.expenseTypes?.join(', ') || 'None'}</div>
												<div><strong>Company:</strong> ${teammate.companies?.join(', ') || 'None'}</div>
												<div><strong>Resource Group:</strong> ${teammate.resourceGroups?.join(', ') || 'None'}</div>
												<div><strong>Resource Type:</strong> ${teammate.resourceTypes?.join(', ') || 'None'}</div>
											</div>
										`}
										{@const isExpanded = expandedRows.has(teammate.id)}
										{@const monthsArray = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']}
										<tr>
											<td class="text-nowrap">
												<button
													type="button"
													class="btn btn-sm btn-link p-0 me-1"
													onclick={() => toggleRow(teammate.id)}
													aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
												>
													<i class="bi {isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}"></i>
												</button>
												<strong>{teammate.name}</strong>
												<span class="float-end">
													<i 
														class="bi bi-info-circle text-info ms-1" 
														style="cursor: help; font-size: 0.875rem;"
														data-bs-toggle="tooltip"
														data-bs-html="true"
														data-bs-placement="top"
														title={tooltipContent}
														aria-label="View grouping values"
													></i>
												</span>
											</td>
											{#each monthsArray as month}
												{@const cellValue = calculateCellValue(teammate, month)}
												<td class="text-nowrap text-end">
													{cellValue ? `$${cellValue}` : ''}
												</td>
											{/each}
										</tr>
										{#if isExpanded}
											<tr class="table-light">
												<td class="text-nowrap small text-muted"></td>
												{#each monthsArray as month}
													<td class="text-nowrap text-end">
														<input
															type="text"
															class="form-control form-control-sm text-end"
															placeholder="0"
															value={getForecastValue(teammate.id, month)}
															oninput={(e) => setForecastValue(teammate.id, month, e.target.value)}
														/>
													</td>
												{/each}
											</tr>
										{/if}
									{/each}
									<!-- Totals Row -->
									<tr class="fw-bold">
										<td class="text-nowrap text-end">Total</td>
										{#each ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as month}
											<td class="text-nowrap text-end">
												{(() => {
													const total = calculateColumnTotal(month);
													return total ? `$${total}` : '';
												})()}
											</td>
										{/each}
									</tr>
								</tbody>
							</table>
					</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Admin Panel Component -->
<AdminPanel 
	bind:this={adminPanelRef}
	bind:showAdminWindow
	onGroupingsChange={handleGroupingsChange}
	onTeammatesChange={handleTeammatesChange}
/>

