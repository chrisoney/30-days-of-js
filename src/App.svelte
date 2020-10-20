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
	import DayEleven from './day_files/DayEleven/DayEleven.svelte'
	import DayTwelve from './day_files/DayTwelve/DayTwelve.svelte'
	import DayThirteen from './day_files/DayThirteen/DayThirteen.svelte'
	import DayFourteen from './day_files/DayFourteen/DayFourteen.svelte'
	import DayFifteen from './day_files/DayFifteen/DayFifteen.svelte'
	import DaySixteen from './day_files/DaySixteen/DaySixteen.svelte'
	import DaySeventeen from './day_files/DaySeventeen/DaySeventeen.svelte'
	import DayEighteen from './day_files/DayEighteen/DayEighteen.svelte'
	import DayNineteen from './day_files/DayNineteen/DayNineteen.svelte'
	import DayTwenty from './day_files/DayTwenty/DayTwenty.svelte'
	import DayTwentyOne from './day_files/DayTwentyOne/DayTwentyOne.svelte'
	import DayTwentyTwo from './day_files/DayTwentyTwo/DayTwentyTwo.svelte'
	import DayTwentyThree from './day_files/DayTwentyThree/DayTwentyThree.svelte'
	import DayTwentyFour from './day_files/DayTwentyFour/DayTwentyFour.svelte'
	import DayTwentyFive from './day_files/DayTwentyFive/DayTwentyFive.svelte'
	import DayTwentySix from './day_files/DayTwentySix/DayTwentySix.svelte'
	import DayTwentySeven from './day_files/DayTwentySeven/DayTwentySeven.svelte'
	import DayTwentyEight from './day_files/DayTwentyEight/DayTwentyEight.svelte'
	import DayTwentyNine from './day_files/DayTwentyNine/DayTwentyNine.svelte'
	import DayThirty from './day_files/DayThirty/DayThirty.svelte'


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
			<div id="6" class="page">
				<DaySix />
			</div>
			<div id="7" class="page">
				<DaySeven />
			</div>
			<div id="8" class="page">
				<DayEight />
			</div>
			<div id="9" class="page">
				<DayNine />
			</div>
			<div id="10" class="page">
				<DayTen />
			</div>
			<div id="11" class="page">
				<DayEleven />
			</div>
			<div id="12" class="page">
				<DayTwelve />
			</div>
			<div id="13" class="page">
				<DayThirteen />
			</div>
			<div id="14" class="page">
				<DayFourteen />
			</div>
			<div id="15" class="page">
				<DayFifteen />
			</div>
			<div id="16" class="page">
				<DaySixteen />
			</div>
			<div id="17" class="page">
				<DaySeventeen />
			</div>
			<div id="18" class="page">
				<DayEighteen />
			</div>
			<div id="19" class="page">
				<DayNineteen />
			</div>
			<div id="20" class="page">
				<DayTwenty />
			</div>
			<div id="21" class="page">
				<DayTwentyOne />
			</div>
			<div id="22" class="page">
				<DayTwentyTwo />
			</div>
			<div id="23" class="page">
				<DayTwentyThree />
			</div>
			<div id="24" class="page">
				<DayTwentyFour />
			</div>
			<div id="25" class="page">
				<DayTwentyFive />
			</div>
			<div id="26" class="page">
				<DayTwentySix />
			</div>
			<div id="27" class="page">
				<DayTwentySeven />
			</div>
			<div id="28" class="page">
				<DayTwentyEight />
			</div>
			<div id="29" class="page">
				<DayTwentyNine />
			</div>
			<div id="30" class="page">
				<DayThirty />
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