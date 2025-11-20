<script>
	import { slide, fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import GroupingsManager from './GroupingsManager.svelte';
	import TeammatesManager from './TeammatesManager.svelte';

	let {
		showAdminWindow = $bindable(false),
		onGroupingsChange = () => {},
		onTeammatesChange = () => {}
	} = $props();

	let activeScreen = $state('groupings'); // 'groupings' or 'teammates'
	let isSaving = $state(false);
	let groupings = $state(null);
	let groupingsManagerRef = $state(null);
	let teammatesManagerRef = $state(null);

	function setActiveScreen(screen) {
		activeScreen = screen;
	}

	function handleGroupingsChange(newGroupings) {
		groupings = newGroupings;
		onGroupingsChange(newGroupings);
	}

	function handleTeammatesChange(teammates) {
		onTeammatesChange(teammates);
	}

	// Expose methods to get data
	export function getGroupings() {
		if (groupingsManagerRef) {
			return groupingsManagerRef.getGroupings();
		}
		return groupings;
	}

	export function getTeammates() {
		if (teammatesManagerRef) {
			return teammatesManagerRef.getTeammates();
		}
		return [];
	}
</script>

{#if showAdminWindow}
	<!-- Backdrop -->
	<div 
		class="position-fixed top-0 start-0 w-100 h-100"
		style="background-color: rgba(0,0,0,0.5); z-index: 1040;"
		role="button"
		tabindex="0"
		onclick={() => showAdminWindow = false}
		onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? showAdminWindow = false : null}
		aria-label="Close admin panel"
		transition:fade={{ duration: 300 }}
	></div>
	
	<!-- Sidebar Panel -->
	<div 
		class="position-fixed top-0 start-0 h-100 bg-white shadow-lg"
		style="width: 400px; max-width: 90vw; z-index: 1050; overflow-y: auto;"
		role="dialog"
		aria-modal="true"
		aria-label="Admin panel"
		tabindex="0"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			e.stopPropagation();
			if (e.key === 'Escape') {
				showAdminWindow = false;
			}
		}}
		transition:slide={{ axis: 'x', duration: 300 }}
	>
		<div class="d-flex flex-column h-100">
			<div class="p-3 border-bottom">
				<div class="d-flex justify-content-between align-items-center">
					<h5 class="mb-0">
						<i class="bi bi-gear me-2"></i>
						Admin Panel
					</h5>
					{#if isSaving}
						<span class="badge bg-info">
							<i class="bi bi-arrow-repeat spin me-1"></i>
							Saving...
						</span>
					{/if}
				</div>
			</div>
			
			<!-- Navigation Tabs -->
			<div class="p-3 border-bottom">
				<div class="btn-group w-100" role="group">
					<button
						type="button"
						class="btn btn-sm flex-fill {activeScreen === 'groupings' ? 'btn-secondary' : 'btn-outline-secondary'}"
						onclick={() => setActiveScreen('groupings')}
					>
						<i class="bi bi-collection me-1"></i>
						Groupings
					</button>
					<button
						type="button"
						class="btn btn-sm flex-fill {activeScreen === 'teammates' ? 'btn-secondary' : 'btn-outline-secondary'}"
						onclick={() => setActiveScreen('teammates')}
					>
						<i class="bi bi-people me-1"></i>
						Teammates
					</button>
				</div>
			</div>

			<!-- Content Area -->
			<div class="p-3 flex-grow-1 overflow-auto">
				{#if activeScreen === 'groupings'}
					<GroupingsManager 
						bind:this={groupingsManagerRef}
						onGroupingsChange={handleGroupingsChange}
					/>
				{:else if activeScreen === 'teammates'}
					<TeammatesManager 
						bind:this={teammatesManagerRef}
						bind:groupings
						onTeammatesChange={handleTeammatesChange}
					/>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.spin {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>

