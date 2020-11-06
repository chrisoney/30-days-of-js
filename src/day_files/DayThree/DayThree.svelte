<script>
	import { onMount } from 'svelte';
	let controls;
	let inputs = [];

	onMount(() => {
     inputs = controls.querySelectorAll('input');
     inputs.forEach((input) => input.addEventListener("change", handleUpdate));
		 inputs.forEach((input) => input.addEventListener("mousemove", handleUpdate));
  });
	function handleUpdate(){
		const suffix = this.dataset.sizing || "";
		console.log(suffix);
		document.documentElement.style.setProperty(`--${this.name}`, this.value + suffix);
	}
	
	

</script>

<div class="day-main">
  <h2>Update CSS Variables with <span class='hl'>JS</span></h2>

  <div class="controls" bind:this={controls}>
    <label for="spacing">Spacing:</label>
    <input id="spacing" type="range" name="spacing" min="10" max="200" value="10" data-sizing="px">

    <label for="blur">Blur:</label>
    <input id="blur" type="range" name="blur" min="0" max="25" value="10" data-sizing="px">

    <label for="base">Base Color</label>
    <input id="base" type="color" name="base" value="#ffc600">
  </div>

  <img src="https://source.unsplash.com/7bwQXzbF6KE/800x500" alt="">
</div>

<style>
	:root {
		--base: #ffc600;
		--spacing: 10px;
		--blur: 10px;
	}

	
	img {
		width: 400px;
		height: auto;
		padding: var(--spacing);
		background: var(--base);
		filter: blur(var(--blur));
	}

	.hl {
		color: var(--base);
	}

  .day-main{
		height:100vh;
		width: 100vw;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		text-align: center;
		background: #193549;
		color: white;
		font-family: 'helvetica neue', sans-serif;
		font-weight: 50;
		font-size: 25px;
	}

	.controls {
		margin-bottom: 30px;
		display: flex;
		align-items: center;
	}

	label {
		margin-right: 10px;
	}

	input {
		width: 100px;
		margin-right: 10px;
	}
</style>