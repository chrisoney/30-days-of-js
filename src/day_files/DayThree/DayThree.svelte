<script>

</script>

<div class="day-main">
  <h2>Update CSS Variables with <span class='hl'>JS</span></h2>

  <div class="controls">
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
  .day-main{
		margin-top: 10px;
		height:100%;
		width: 100vw;
		display: flex;
		justify-content: center;
		align-items: center;
		text-align: center;
		background: #193549;
		color: white;
		font-family: 'helvetica neue', sans-serif;
		font-weight: 100;
		font-size: 50px;
	}

	.controls {
		margin-bottom: 50px;
	}

	input {
		width: 100px;
	}
</style>