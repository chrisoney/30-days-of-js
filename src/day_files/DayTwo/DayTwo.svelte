<script>
	let secondHand, minuteHand, hourHand;
	function setDate(){
		const now = new Date();
		const seconds = now.getSeconds();
		const minutes = now.getMinutes();
		const hours = now.getHours();
		const secondsDegrees = ((seconds / 60) * 360) + 90;
		const minutesDegrees = ((minutes / 60) * 360) + 90;
		const hoursDegrees = ((hours / 12) * 360) + 90;
		if (seconds === 0){
			secondHand.style.transition = "none";
		} else {
			secondHand.style.transition = "all 0.05s";
			secondHand.style.transitionTimingFunction = "cubic-bezier(0.1, 2.7, 0.58, 1)";
		}
		secondHand.style.transform = `rotate(${secondsDegrees}deg)`;
		if (minutes === 0){
			minuteHand.style.transition = "none";
		} else {
			minuteHand.style.transition = "all 0.05s";
			minuteHand.style.transitionTimingFunction = "cubic-bezier(0.1, 2.7, 0.58, 1)";
		}
		minuteHand.style.transform = `rotate(${minutesDegrees}deg)`;
		if (hours === 0){
			hourHand.style.transition = "none";
		} else {
			hourHand.style.transition = "all 0.05s";
			hourHand.style.transitionTimingFunction = "cubic-bezier(0.1, 2.7, 0.58, 1)";
		}
		hourHand.style.transform = `rotate(${hoursDegrees}deg)`;
	}

	setInterval(setDate, 1000);

</script>

<div class="day-main">
  <div class="clock">
		<div class="clock-face">
			<div class="center"></div>
			<div class="hand" bind:this="{secondHand}"></div>
			<div class="hand min" bind:this="{minuteHand}"></div>
			<div class="hand hour" bind:this="{hourHand}"></div>
		</div>
	</div>
</div>

<style>
  .day-main{
		margin-top: 10px;
		height:100%;
		width: 100vw;
		display: flex;
		justify-content: center;
		align-items: center;
		background: #018DED url(https://unsplash.it/1500/1000?image=881&blur=5);
		background-size: cover;
		font-family: 'helvetica neue';
		text-align: center;
		font-size: 10px;
		margin: 0;
		font-size: 2rem;
		display: flex;
		flex: 1;
		min-height: 100vh;
		align-items: center;
	}

    .clock {
      width: 30rem;
      height: 30rem;
      border: 20px solid white;
      border-radius: 50%;
      margin: 50px auto;
      position: relative;
      padding: 2rem;
      box-shadow:
        0 0 0 4px rgba(0,0,0,0.1),
        inset 0 0 0 3px #EFEFEF,
        inset 0 0 10px black,
        0 0 10px rgba(0,0,0,0.2);
    }

    .clock-face {
      position: relative;
      width: 100%;
      height: 100%;
      transform: translateY(-3px); /* account for the height of the clock hands */
    }

    .hand {
      width: 50%;
      height: 4px;
      background: black;
      position: absolute;
			top: 50%;
			transform-origin: 100%;
			transform: rotate(90deg);
			transition: all 0.05s;
			transition-timing-function: cubic-bezier(0.1, 2.7, 0.58, 1);
		}
		.min {
			width: 40%;
			height: 6px;
			transform-origin: 100%;
			left: 10%;
		}

		.hour {
			width: 30%;
			height: 8px;
			transform-origin: 100%;
			left: 20%;
		}

		/* .center {
			width: 15px;
			height: 15px;
			border-radius: 50%;
			position: absolute;
			background-color: black;
			top: 49.5%;
			left: 49%;
		} */

</style>