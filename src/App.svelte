<script>
	import days from './days.js';
	import Modal from './Modal.svelte';
	import Home from './day_files/Home.svelte';
	import DayOne from './day_files/DayOne/DayOne.svelte'
	import DayTwo from './day_files/DayTwo/DayTwo.svelte'
	import DayThree from './day_files/DayThree/DayThree.svelte'
	import DayFour from './day_files/DayFour/DayFour.svelte'
	import DayFive from './day_files/DayFive/DayFive.svelte'
	import DaySix from './day_files/DaySix/DaySix.svelte'
	import DaySeven from './day_files/DaySeven/DaySeven.svelte'
	import DayEight from './day_files/DayEight/DayEight.svelte'
	import DayNine from './day_files/DayNine/DayNine.svelte'
	import DayTen from './day_files/DayTen/DayTen.svelte'
	import { page, modalOpen } from './stores.js';
	let pageNum = 0;
	let isModalOpen = false;
	const unsubscribe = modalOpen.subscribe(value => {
		isModalOpen = value;
	});

	function openModal(e){
		e.preventDefault();

		modalOpen.update(n => n = !n);
	}

	// let modalOpen = false;
</script>

<svelte:head>
	<script src="https://kit.fontawesome.com/a229c5b13d.js" crossorigin="anonymous"></script>
</svelte:head>
<main>
	<p>30 Days Of Javascript</p>
	<span class="menu fas fa-bars" on:click={e => openModal(e)}></span>
	<div class="main-section">
		{#if isModalOpen}
			<Modal />
		{/if}
		<div class="pages">
			<div id="home" class="page">
				<Home />
			</div>
			<div id="1" class="page">
				<DayOne />
			</div>
			<div id="2" class="page">
				<DayTwo />
			</div>
			<div id="3" class="page">
				<DayThree />
			</div>
			<div id="4" class="page">
				<DayFour />
			</div>
			<div id="5" class="page">
				<DayFive />
			</div>
		</div>
	</div>
</main>

<style>
	main {
		text-align: center;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100vw;
	}

	p {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
		margin-block-start: 0;
		margin-block-end: 0;
		margin-left: 20px;
		margin-right: 20px;
	}

	.menu {
		position: absolute;
		top: 0;
		left: 0;
		margin-top: 2%;
		margin-left: 2%;
		cursor: pointer;
	}

	.main-section{
		display: flex;
		flex-direction: row;
		position: relative;
		width: 100%;
		height: 100%;
	}

	.pages{
		width: 100vw;
		display: flex;
		justify-content: center;
	}

	.page {
		display: none;
	}

	#home {
		display: block;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>