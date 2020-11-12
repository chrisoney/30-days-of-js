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
	const unsubscribeTwo = page.subscribe(value => {
		pageNum = value;
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
			{#if pageNum === 0}
			<div id="home" class="page">
				<Home />
			</div>
			{:else if pageNum === 1}
			<div id="1" class="page">
				<DayOne />
			</div>
			{:else if pageNum === 2}
			<div id="2" class="page">
				<DayTwo />
			</div>
			{:else if pageNum === 3}
			<div id="3" class="page">
				<DayThree />
			</div>
			{:else if pageNum === 4}
			<div id="4" class="page">
				<DayFour />
			</div>
			{:else if pageNum === 5}
			<div id="5" class="page">
				<DayFive />
			</div>
			{:else if pageNum === 6}
			<div id="6" class="page">
				<DaySix />
			</div>
			{:else if pageNum === 7}
			<div id="7" class="page">
				<DaySeven />
			</div>
			{:else if pageNum === 8}
			<div id="8" class="page">
				<DayEight />
			</div>
			{:else if pageNum === 9}
			<div id="9" class="page">
				<DayNine />
			</div>
			{:else if pageNum === 10}
			<div id="10" class="page">
				<DayTen />
			</div>
			{:else if pageNum === 11}
			<div id="11" class="page">
				<DayEleven />
			</div>
			{:else if pageNum === 12}
			<div id="12" class="page">
				<DayTwelve />
			</div>
			{:else if pageNum === 13}
			<div id="13" class="page">
				<DayThirteen />
			</div>
			{:else if pageNum === 14}
			<div id="14" class="page">
				<DayFourteen />
			</div>
			{:else if pageNum === 15}
			<div id="15" class="page">
				<DayFifteen />
			</div>
			{:else if pageNum === 16}
			<div id="16" class="page">
				<DaySixteen />
			</div>
			{:else if pageNum === 17}
			<div id="17" class="page">
				<DaySeventeen />
			</div>
			{:else if pageNum === 18}
			<div id="18" class="page">
				<DayEighteen />
			</div>
			{:else if pageNum === 19}
			<div id="19" class="page">
				<DayNineteen />
			</div>
			{:else if pageNum === 20}
			<div id="20" class="page">
				<DayTwenty />
			</div>
			{:else if pageNum === 21}
			<div id="21" class="page">
				<DayTwentyOne />
			</div>
			{:else if pageNum === 22}
			<div id="22" class="page">
				<DayTwentyTwo />
			</div>
			{:else if pageNum === 23}
			<div id="23" class="page">
				<DayTwentyThree />
			</div>
			{:else if pageNum === 24}
			<div id="24" class="page">
				<DayTwentyFour />
			</div>
			{:else if pageNum === 25}
			<div id="25" class="page">
				<DayTwentyFive />
			</div>
			{:else if pageNum === 26}
			<div id="26" class="page">
				<DayTwentySix />
			</div>
			{:else if pageNum === 27}
			<div id="27" class="page">
				<DayTwentySeven />
			</div>
			{:else if pageNum === 28}
			<div id="28" class="page">
				<DayTwentyEight />
			</div>
			{:else if pageNum === 29}
			<div id="29" class="page">
				<DayTwentyNine />
			</div>
			{:else if pageNum === 30}
			<div id="30" class="page">
				<DayThirty />
			</div>
			{/if}
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
		width: 100%;
		background: green;
	}

	.menu {
		position: absolute;
		top: 0;
		left: 0;
		margin-top: 2%;
		margin-left: 2%;
		cursor: pointer;
		background: black;
		color: white;
		border-radius: 5px;
		padding: 5px 8px;
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

	#home {
		display: block;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>