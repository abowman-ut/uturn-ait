<script>
	import { generateClient } from 'aws-amplify/data';
	import '$lib/amplify';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	const client = generateClient();

	let {
		groupings = $bindable(null),
		onTeammatesChange = () => {}
	} = $props();

	// Teammates data
	let teammates = $state([]);
	let isLoadingTeammates = $state(false);
	let isEditingTeammate = $state(false);
	let editingTeammateId = $state(null);
	let activeTeammateScreen = $state('add'); // 'add' or 'existing'
	let isSaving = $state(false);

	// Form state
	let teammateName = $state('');
	let teammateBaseRate = $state('');
	let teammateContracts = $state('');
	let teammateExpenseTypes = $state('');
	let teammateCompanies = $state('');
	let teammateResourceGroups = $state('');
	let teammateResourceTypes = $state('');

	// Load teammates from database
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
			notifyParent();
		} catch (error) {
			console.error('Error loading teammates:', error);
			teammates = [];
		} finally {
			isLoadingTeammates = false;
		}
	}

	// Save teammate to database
	async function saveTeammate() {
		if (!browser) return;
		
		if (!client.models.Teammate) {
			alert('Teammate model not available. Please run "npx ampx sandbox" to deploy schema changes.');
			return;
		}

		// Validate required fields
		if (!teammateName.trim()) {
			alert('Name is required');
			return;
		}

		if (!teammateBaseRate || isNaN(parseFloat(teammateBaseRate))) {
			alert('Base rate must be a valid number');
			return;
		}

		// Validate required associations
		if (!teammateContracts || !teammateExpenseTypes || 
		    !teammateCompanies || !teammateResourceGroups || 
		    !teammateResourceTypes) {
			alert('All groupings associations are required');
			return;
		}

		isSaving = true;
		try {
			const data = {
				name: teammateName.trim(),
				baseRate: parseFloat(teammateBaseRate),
				contracts: [teammateContracts],
				expenseTypes: [teammateExpenseTypes],
				companies: [teammateCompanies],
				resourceGroups: [teammateResourceGroups],
				resourceTypes: [teammateResourceTypes],
			};

			if (editingTeammateId) {
				await client.models.Teammate.update({
					id: editingTeammateId,
					...data,
				});
			} else {
				await client.models.Teammate.create(data);
			}

			// Reset form and switch to existing screen
			resetTeammateForm();
			await loadTeammates();
			activeTeammateScreen = 'existing';
		} catch (error) {
			console.error('Error saving teammate:', error);
			alert('Error saving teammate: ' + (error.message || error));
		} finally {
			isSaving = false;
		}
	}

	function resetTeammateForm() {
		teammateName = '';
		teammateBaseRate = '';
		teammateContracts = '';
		teammateExpenseTypes = '';
		teammateCompanies = '';
		teammateResourceGroups = '';
		teammateResourceTypes = '';
		editingTeammateId = null;
		isEditingTeammate = false;
	}

	function editTeammate(teammate) {
		teammateName = teammate.name;
		teammateBaseRate = teammate.baseRate?.toString() || '';
		teammateContracts = teammate.contracts?.[0] || '';
		teammateExpenseTypes = teammate.expenseTypes?.[0] || '';
		teammateCompanies = teammate.companies?.[0] || '';
		teammateResourceGroups = teammate.resourceGroups?.[0] || '';
		teammateResourceTypes = teammate.resourceTypes?.[0] || '';
		editingTeammateId = teammate.id;
		isEditingTeammate = true;
		activeTeammateScreen = 'add'; // Switch to add screen when editing
	}

	async function deleteTeammate(id) {
		if (!confirm('Are you sure you want to delete this teammate?')) {
			return;
		}

		if (!client.models.Teammate) return;

		try {
			await client.models.Teammate.delete({ id });
			await loadTeammates();
		} catch (error) {
			console.error('Error deleting teammate:', error);
			alert('Error deleting teammate: ' + (error.message || error));
		}
	}

	function setAssociation(arrayName, value) {
		switch(arrayName) {
			case 'contracts':
				teammateContracts = teammateContracts === value ? '' : value;
				break;
			case 'expenseTypes':
				teammateExpenseTypes = teammateExpenseTypes === value ? '' : value;
				break;
			case 'companies':
				teammateCompanies = teammateCompanies === value ? '' : value;
				break;
			case 'resourceGroups':
				teammateResourceGroups = teammateResourceGroups === value ? '' : value;
				break;
			case 'resourceTypes':
				teammateResourceTypes = teammateResourceTypes === value ? '' : value;
				break;
		}
	}

	function notifyParent() {
		onTeammatesChange(teammates);
	}

	// Expose teammates getter for parent access
	export function getTeammates() {
		return teammates;
	}

	// Reload when groupings change
	$effect(() => {
		if (groupings) {
			// Groupings changed, but we don't need to reload teammates
		}
	});

	onMount(() => {
		loadTeammates();
	});
</script>

<div>
	<h6 class="mb-3">
		<i class="bi bi-people me-2"></i>
		Teammates
	</h6>

	<!-- Sub-navigation Tabs -->
	<div class="mb-3">
		<div class="btn-group w-100" role="group">
			<button
				type="button"
				class="btn btn-sm flex-fill {activeTeammateScreen === 'add' ? 'btn-secondary' : 'btn-outline-secondary'}"
				onclick={() => { activeTeammateScreen = 'add'; resetTeammateForm(); }}
			>
				<i class="bi bi-person-plus me-1"></i>
				Add Teammate
			</button>
			<button
				type="button"
				class="btn btn-sm flex-fill {activeTeammateScreen === 'existing' ? 'btn-secondary' : 'btn-outline-secondary'}"
				onclick={() => activeTeammateScreen = 'existing'}
			>
				<i class="bi bi-list-ul me-1"></i>
				Existing Teammates
			</button>
		</div>
	</div>

	<!-- Add/Edit Teammate Form -->
	{#if activeTeammateScreen === 'add'}
	<div class="card mb-3">
		<div class="card-body">
			<h6 class="card-title">{isEditingTeammate ? 'Edit' : 'Add'} Teammate</h6>
			
			<div class="mb-3">
				<label for="teammate-name" class="form-label small fw-bold">Name *</label>
				<input
					id="teammate-name"
					type="text"
					class="form-control form-control-sm"
					placeholder="Enter teammate name"
					bind:value={teammateName}
				/>
			</div>

			<div class="mb-3">
				<label for="teammate-base-rate" class="form-label small fw-bold">Base Rate *</label>
				<input
					id="teammate-base-rate"
					type="number"
					step="0.01"
					class="form-control form-control-sm"
					placeholder="Enter base rate"
					bind:value={teammateBaseRate}
				/>
			</div>

			<!-- Groupings Associations -->
			<div class="mb-3">
				<div class="form-label small fw-bold">Contract *</div>
				<div class="d-flex flex-wrap gap-1">
					{#if groupings?.contracts}
						{#each groupings.contracts as contract}
							<button
								type="button"
								class="btn btn-xs {teammateContracts === contract ? 'btn-secondary' : 'btn-outline-secondary'}"
								style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"
								onclick={() => setAssociation('contracts', contract)}
							>
								{contract}
							</button>
						{/each}
					{/if}
					{#if !groupings?.contracts || groupings.contracts.length === 0}
						<small class="text-muted">No contracts available. Add them in Groupings.</small>
					{/if}
				</div>
			</div>

			<div class="mb-3">
				<div class="form-label small fw-bold">Expense Type *</div>
				<div class="d-flex flex-wrap gap-1">
					{#if groupings?.expenseTypes}
						{#each groupings.expenseTypes as expenseType}
							<button
								type="button"
								class="btn btn-xs {teammateExpenseTypes === expenseType ? 'btn-secondary' : 'btn-outline-secondary'}"
								style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"
								onclick={() => setAssociation('expenseTypes', expenseType)}
							>
								{expenseType}
							</button>
						{/each}
					{/if}
					{#if !groupings?.expenseTypes || groupings.expenseTypes.length === 0}
						<small class="text-muted">No expense types available. Add them in Groupings.</small>
					{/if}
				</div>
			</div>

			<div class="mb-3">
				<div class="form-label small fw-bold">Company *</div>
				<div class="d-flex flex-wrap gap-1">
					{#if groupings?.companies}
						{#each groupings.companies as company}
							<button
								type="button"
								class="btn btn-xs {teammateCompanies === company ? 'btn-secondary' : 'btn-outline-secondary'}"
								style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"
								onclick={() => setAssociation('companies', company)}
							>
								{company}
							</button>
						{/each}
					{/if}
					{#if !groupings?.companies || groupings.companies.length === 0}
						<small class="text-muted">No companies available. Add them in Groupings.</small>
					{/if}
				</div>
			</div>

			<div class="mb-3">
				<div class="form-label small fw-bold">Resource Group *</div>
				<div class="d-flex flex-wrap gap-1">
					{#if groupings?.resourceGroups}
						{#each groupings.resourceGroups as resourceGroup}
							<button
								type="button"
								class="btn btn-xs {teammateResourceGroups === resourceGroup ? 'btn-secondary' : 'btn-outline-secondary'}"
								style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"
								onclick={() => setAssociation('resourceGroups', resourceGroup)}
							>
								{resourceGroup}
							</button>
						{/each}
					{/if}
					{#if !groupings?.resourceGroups || groupings.resourceGroups.length === 0}
						<small class="text-muted">No resource groups available. Add them in Groupings.</small>
					{/if}
				</div>
			</div>

			<div class="mb-3">
				<div class="form-label small fw-bold">Resource Type *</div>
				<div class="d-flex flex-wrap gap-1">
					{#if groupings?.resourceTypes}
						{#each groupings.resourceTypes as resourceType}
							<button
								type="button"
								class="btn btn-xs {teammateResourceTypes === resourceType ? 'btn-secondary' : 'btn-outline-secondary'}"
								style="font-size: 0.7rem; padding: 0.15rem 0.4rem;"
								onclick={() => setAssociation('resourceTypes', resourceType)}
							>
								{resourceType}
							</button>
						{/each}
					{/if}
					{#if !groupings?.resourceTypes || groupings.resourceTypes.length === 0}
						<small class="text-muted">No resource types available. Add them in Groupings.</small>
					{/if}
				</div>
			</div>

			<div class="d-flex gap-2 justify-content-end">
				<button
					type="button"
					class="btn btn-primary btn-sm"
					onclick={saveTeammate}
					disabled={isSaving}
				>
					{isEditingTeammate ? 'Update' : 'Add'} Teammate
				</button>
				{#if isEditingTeammate}
					<button
						type="button"
						class="btn btn-secondary btn-sm"
						onclick={resetTeammateForm}
					>
						Cancel
					</button>
				{/if}
			</div>
		</div>
	</div>
	{/if}

	<!-- Teammates List -->
	{#if activeTeammateScreen === 'existing'}
	<div>
		{#if teammates.length === 0}
			<p class="text-muted small">No teammates added yet.</p>
		{:else}
			<div class="list-group">
				{#each teammates as teammate}
					<div class="list-group-item">
						<div class="d-flex justify-content-between align-items-start">
							<div class="flex-grow-1">
								<h6 class="mb-1">{teammate.name}</h6>
								<p class="mb-1 small text-muted">Base Rate: ${teammate.baseRate?.toFixed(2) || '0.00'}</p>
								<div class="small">
									<div><strong>Contract:</strong> {teammate.contracts?.join(', ') || 'None'}</div>
									<div><strong>Expense Type:</strong> {teammate.expenseTypes?.join(', ') || 'None'}</div>
									<div><strong>Company:</strong> {teammate.companies?.join(', ') || 'None'}</div>
									<div><strong>Resource Group:</strong> {teammate.resourceGroups?.join(', ') || 'None'}</div>
									<div><strong>Resource Type:</strong> {teammate.resourceTypes?.join(', ') || 'None'}</div>
								</div>
							</div>
							<div class="d-flex gap-1">
								<button
									type="button"
									class="btn btn-sm btn-outline-primary"
									onclick={() => editTeammate(teammate)}
									aria-label="Edit teammate"
								>
									<i class="bi bi-pencil"></i>
								</button>
								<button
									type="button"
									class="btn btn-sm btn-outline-danger"
									onclick={() => deleteTeammate(teammate.id)}
									aria-label="Delete teammate"
								>
									<i class="bi bi-trash"></i>
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	{/if}
</div>

