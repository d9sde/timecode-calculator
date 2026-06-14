//
// TimeCode Calculator
// by Danny Schreiter
// contact: www.d9s.de
// 06/2026
//
// see https://d9sde.github.io/timecode-calculator/ for license and further details
//


"use strict";


let framesPerSecond = 25;						// default FPS option
const FPS_options = [24, 25, 30, 48, 50, 60];	// available FPS options
let max_hours = 24;								// default option for maximal hour value (24 is relevant for real-time)


window.onload = function() {
	
	// check for dark color theme
	const getPreferredTheme = () => {
		// Prüft, ob das System auf Dark Mode eingestellt ist
		if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			return 'dark';
		}
		return 'light'; // Standardfall, wenn Windows auf "Hell" steht
	}

	const setTheme = theme => {
		document.documentElement.setAttribute('data-bs-theme', theme);
	}

	setTheme(getPreferredTheme());

    // react to live changes of color theme
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		setTheme(getPreferredTheme());
	});
	
	
	document.querySelectorAll('input.addend').forEach(input => {		// init input fields
		init_TC_input(input);
	});
	
	document.querySelectorAll('input.sum').forEach(output => {			// init output fields
		init_TC_output(output);
	});	
	
	document.querySelector('input.addend').focus();						// focus an firts addend field
}


function init_TC_input(Input_Object) {
	
	Input_Object.value = "00:00:00:00";
	
	Input_Object.addEventListener('keydown', (event) => {

		if (event.key === '+') {
			event.preventDefault();
			Input_Object.parentElement.querySelector('.operator').innerText = "+";
			calculate(Input_Object.parentElement);
			if(Input_Object.parentElement.querySelector('.addend') === Input_Object)
			{
				Input_Object.parentElement.querySelectorAll(':scope > .addend')[1].focus();	
			}
		}

		if (event.key === '-') {
			event.preventDefault(); 
			Input_Object.parentElement.querySelector('.operator').innerText = "-";
			calculate(Input_Object.parentElement);
			if(Input_Object.parentElement.querySelector('.addend') === Input_Object)
			{
				Input_Object.parentElement.querySelectorAll(':scope > .addend')[1].focus();	
			}
		}	

		if (event.key === 'n' || event.key === 'N') {				// set field to zero
			event.preventDefault(); 
			const CursorPos = Input_Object.selectionStart;
			Input_Object.value = "00:00:00:00";
			parseTC(Input_Object);
			calculate(Input_Object.parentElement);
			Input_Object.setSelectionRange(CursorPos, CursorPos);
		}
		
		if (event.key === 'z' || event.key === 'Z') {				// add new line
			event.preventDefault(); 
			add_line();
			return true;
		}

		if (event.key === 'f' || event.key === 'F') {				// change FPS value
			event.preventDefault(); 
			change_FPS();
			return true;
		}			

		if (event.key === 'ArrowUp') {
			event.preventDefault(); 
			const thisInput = event.target; 
			const SiblingList = thisInput.parentElement.querySelectorAll(':scope > input.addend');
			const index = Array.from(SiblingList).indexOf(thisInput);
			const prevZeile = Input_Object.closest(".zeile").previousElementSibling.querySelectorAll('.addend')[index];
			if(!prevZeile)
				return;
			prevZeile.focus();
			prevZeile.setSelectionRange(0, 0);
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault(); 
			const thisInput = event.target; 
			const SiblingList = thisInput.parentElement.querySelectorAll(':scope > input.addend');
			const index = Array.from(SiblingList).indexOf(thisInput);			
			try {
				const nextZeile = Input_Object.closest(".zeile").nextElementSibling.querySelectorAll('.addend')[index];			
				nextZeile.focus();
				nextZeile.setSelectionRange(0, 0);	
			}
				catch { return; }			
		}	

		if (event.key === 'ArrowRight') {
			const thisInput = event.target; 
			const CursorPos = thisInput.selectionStart == thisInput.selectionEnd ? thisInput.selectionStart : -1;
			if(CursorPos != 11)
				return;
			const SiblingList = thisInput.parentElement.querySelectorAll(':scope > input.addend');
			const index = Array.from(SiblingList).indexOf(thisInput);
			if(index != 0)
				return;			
	
			event.preventDefault(); 

			const nextFeld = SiblingList[1];
			if(!nextFeld)
				return;
			nextFeld.focus();
			nextFeld.setSelectionRange(0, 0);	
		}	

		if (event.key === 'ArrowLeft') {
			const thisInput = event.target; 
			const CursorPos = thisInput.selectionStart == thisInput.selectionEnd ? thisInput.selectionStart : -1;
			if(CursorPos != 0)
				return;
			const SiblingList = thisInput.parentElement.querySelectorAll(':scope > input.addend');
			const index = Array.from(SiblingList).indexOf(thisInput);
			if(index != 1)
				return;			
			event.preventDefault(); 

			const prevFeld = SiblingList[0];
			if(!prevFeld)
				return;
			prevFeld.focus();
			prevFeld.setSelectionRange(11, 11);	
		}			
		
	});	
	

	Input_Object.addEventListener("wheel", (event) => {
	  if(event.target.classList.contains("is-invalid"))			// no action on invalid timecodes
		return;
	  handle_wheel_movement(event.target, event.deltaY);
	}, { passive: false });

	
	Input_Object.addEventListener("input", (event) => {
		parseTC(event.target);
		calculate(event.target.closest("div.input-group"));
	});
	
	Input_Object.addEventListener("dragstart", (e) => {				// allow drag&drop
	  e.dataTransfer.setData("text/plain", Input_Object.value);
	});

	Input_Object.addEventListener("dragover", (e) => {				// allow drop
	  e.preventDefault();
	});

	Input_Object.addEventListener("drop", (e) => {					// receive value on drop
		e.preventDefault();
		const data = e.dataTransfer.getData("text/plain");
		Input_Object.value = data;
		parseTC(Input_Object);
		calculate(Input_Object.closest("div.input-group"));
	});	
	
}


function init_TC_output(Output_Object) {
	
	Output_Object.value = "00:00:00:00";

	Output_Object.addEventListener("dragstart", (e) => {
	  e.dataTransfer.setData("text/plain", Output_Object.value);
	});
	
	Output_Object.addEventListener('focus', () => {
		Output_Object.select();
	});	
}


function calculate(InputGroup) {
	const resultField = InputGroup.querySelector('.sum');
	const operator = InputGroup.querySelector('.operator').innerText;
	let resultInframes = 0;
	
	if(InputGroup.querySelector('.is-invalid') !== null)					// abort calculation if there are invalid inputs
	{
		resultField.value = "";
		return false;
	}
	
	const allDirectChildren = InputGroup.querySelectorAll(':scope > .addend');
	const Argument1 = allDirectChildren[0];
	const Argument2 = allDirectChildren[1];

	if(operator == "-")
		resultInframes = TC_to_frames(Argument1.value) - TC_to_frames(Argument2.value);
	else
		resultInframes = TC_to_frames(Argument1.value) + TC_to_frames(Argument2.value);	
		
	if(max_hours == 24 && resultInframes >= TC_to_frames("24:00:00:00"))
		resultInframes = resultInframes % TC_to_frames("24:00:00:00");

	if(max_hours == 24 && resultInframes < 0)
		resultInframes = TC_to_frames("24:00:00:00") - (Math.abs(resultInframes) % TC_to_frames("24:00:00:00"));		
	
	resultField.value = frames_to_TC(resultInframes);
	
	return true;
}


function TC_to_frames(TC) {										// converts TC string to number of frames
	const hours = Number(TC.trim().substring(0, 2));
	const minutes = Number(TC.trim().substring(3, 5));
	const seconds = Number(TC.trim().substring(6, 8));
	const frames = Number(TC.trim().substring(9, 11));
	
	return framesPerSecond * hours * 3600 + framesPerSecond * minutes * 60 + framesPerSecond * seconds + frames;
}


function frames_to_TC(framesGes) {								// converts number of frames to TC string
	let prefixCharacter = "";
	if(framesGes < 0)
	{
		framesGes = Math.abs(framesGes);
		prefixCharacter = "-";
	}
	const frames = framesGes % framesPerSecond;
	let Rest = Math.trunc(framesGes / framesPerSecond);
	const seconds = Rest % 60;
	Rest = Math.trunc(Rest / 60);
	const minutes = Rest % 60;
	const hours = Math.trunc(Rest / 60);	
	
	
	return prefixCharacter + hours.toString().padStart(2, '0') + ":" + minutes.toString().padStart(2, '0') + ":" + seconds.toString().padStart(2, '0') + ":" + frames.toString().padStart(2, '0');
}



function parseTC(Input) {
	Input.classList.remove("is-invalid");
	
	let valid_TC = /0/;
	
	const CursorPos = Input.selectionStart == Input.selectionEnd ? Input.selectionStart : -1;
	
	if(max_hours == 24)
	{
		switch(framesPerSecond) {
		case 24: valid_TC = /^(([0-1]\d)|(2[0-3])):[0-5]\d:[0-5]\d:(([0-1]\d)|(2[0-3]))$/;
			break;
		case 25: valid_TC = /^(([0-1]\d)|(2[0-3])):[0-5]\d:[0-5]\d:(([0-1]\d)|(2[0-4]))$/;
			break;
		case 30: valid_TC = /^(([0-1]\d)|(2[0-3])):[0-5]\d:[0-5]\d:[0-2]\d$/;
			break;				
		case 50: valid_TC = /^(([0-1]\d)|(2[0-3])):[0-5]\d:[0-5]\d:[0-4]\d$/;
			break;	
		case 60: default: valid_TC = /^(([0-1]\d)|(2[0-3])):[0-5]\d:[0-5]\d:[0-5]\d$/;
			break;				
		}	
	} else {
		switch(framesPerSecond) {
		case 24: valid_TC = /^\d{2}:[0-5]\d:[0-5]\d:(([0-1]\d)|(2[0-3]))$/;
			break;
		case 25: valid_TC = /^\d{2}:[0-5]\d:[0-5]\d:(([0-1]\d)|(2[0-4]))$/;
			break;
		case 30: valid_TC = /^\d{2}:[0-5]\d:[0-5]\d:[0-2]\d$/;
			break;				
		case 50: valid_TC = /^\d{2}:[0-5]\d:[0-5]\d:[0-4]\d$/;
			break;	
		case 60: default: valid_TC = /^\d{2}:[0-5]\d:[0-5]\d:[0-5]\d$/;
			break;				
		}	
	}


	const onlyNumbers = Input.value.trim().replace(/\D/g, "");
	
	if(onlyNumbers.length == 8)
	{
		const TCstring = eight2TC(onlyNumbers);
		if(valid_TC.test(TCstring))
		{
			Input.value = TCstring;
			Input.setSelectionRange(CursorPos, CursorPos);
			return true;
		}	
	}
	
	


	// case +_4:44:44:44  insert at beginning or in the middle  ---> overwrite
	
	const Regex03 = /^\d{3}:\d{2}:\d{2}:\d{2}$/;	
	if(Regex03.test(Input.value.trim()) && CursorPos == 1)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 1) + onlyNumbers.substring(2, 9));	
			Input.setSelectionRange(1, 1);			
			return parseTC(Input);
	}	
	
		
	if(Regex03.test(Input.value.trim()) && CursorPos == 2)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 2) + onlyNumbers.substring(3, 9));	
			Input.setSelectionRange(3, 3);			
			return parseTC(Input);
	}	
	
	if(Regex03.test(Input.value.trim()) && CursorPos == 3)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 3) + onlyNumbers.substring(4, 9));	
			Input.setSelectionRange(4, 4);			
			return parseTC(Input);
	}		

	const Regex04 = /^\d{2}:\d{3}:\d{2}:\d{2}$/;	
	if(Regex04.test(Input.value.trim()) && CursorPos == 4)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 3) + onlyNumbers.substring(4, 9));	
			Input.setSelectionRange(4, 4);			
			return parseTC(Input);
	}		
		
	if(Regex04.test(Input.value.trim()) && CursorPos == 5)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 4) + onlyNumbers.substring(5, 9));	
			Input.setSelectionRange(6, 6);			
			return parseTC(Input);
	}	

	if(Regex04.test(Input.value.trim()) && CursorPos == 6)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 5) + onlyNumbers.substring(6, 9));	
			Input.setSelectionRange(7, 7);			
			return parseTC(Input);
	}		

	const Regex05 = /^\d{2}:\d{2}:\d{3}:\d{2}$/;	
	if(Regex05.test(Input.value.trim()) && CursorPos == 7)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 5) + onlyNumbers.substring(6, 9));	
			Input.setSelectionRange(7, 7);			
			return parseTC(Input);
	}		
		
	if(Regex05.test(Input.value.trim()) && CursorPos == 8)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 6) + onlyNumbers.substring(7, 9));	
			Input.setSelectionRange(9, 9);			
			return parseTC(Input);
	}	
			
	if(Regex05.test(Input.value.trim()) && CursorPos == 9)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 7) + onlyNumbers.substring(8, 9));	
			Input.setSelectionRange(10, 10);			
			return parseTC(Input);
	}		
			
	const Regex06 = /^\d{2}:\d{2}:\d{2}:\d{3}$/;	
	if(Regex06.test(Input.value.trim()) && CursorPos == 10)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 7) + onlyNumbers.substring(8, 9));	
			Input.setSelectionRange(10, 10);			
			return parseTC(Input);
	}		
		
	if(Regex06.test(Input.value.trim()) && CursorPos == 11)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 8) + onlyNumbers.substring(9, 9));	
			Input.setSelectionRange(11, 11);			
			return parseTC(Input);
	}		


	// case: 44:44:44:44+   insert at end of line    ---> move all digits to the left (like in a calculator)
	
	if(Regex06.test(Input.value.trim()) && CursorPos == 12)
	{
			Input.value = eight2TC(onlyNumbers.substring(1, 9));					
			return parseTC(Input);
	}






	// case:  _4:44:44:44 :  deleted a digit at the beginning or in the middle  --->  replace by zero
	
	const Regex07 = /^\d{1}:\d{2}:\d{2}:\d{2}$/;	
	if(Regex07.test(Input.value.trim()) && CursorPos == 0)
	{
			Input.value = eight2TC("0" + onlyNumbers);	
			Input.setSelectionRange(0, 0);			
			return parseTC(Input);
	}	
		
	if(Regex07.test(Input.value.trim()) && CursorPos == 1)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 1) + "0" + onlyNumbers.substring(1, 7));	
			Input.setSelectionRange(1, 1);			
			return parseTC(Input);
	}	

	const Regex08 = /^\d{2}:\d{1}:\d{2}:\d{2}$/;	
	if(Regex08.test(Input.value.trim()) && CursorPos == 3)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 2) + "0" + onlyNumbers.substring(2, 7));	
			Input.setSelectionRange(3, 3);			
			return parseTC(Input);
	}		
		
	if(Regex08.test(Input.value.trim()) && CursorPos == 4)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 3) + "0" + onlyNumbers.substring(3, 7));	
			Input.setSelectionRange(4, 4);			
			return parseTC(Input);
	}	

	const Regex09 = /^\d{2}:\d{2}:\d{1}:\d{2}$/;	
	if(Regex09.test(Input.value.trim()) && CursorPos == 6)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 4) + "0" + onlyNumbers.substring(4, 7));	
			Input.setSelectionRange(6, 6);			
			return parseTC(Input);
	}		
		
	if(Regex09.test(Input.value.trim()) && CursorPos == 7)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 5) + "0" + onlyNumbers.substring(5, 7));	
			Input.setSelectionRange(7, 7);			
			return parseTC(Input);
	}	

	const Regex10 = /^\d{2}:\d{2}:\d{2}:\d{1}$/;	
	if(Regex10.test(Input.value.trim()) && CursorPos == 9)
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 6) + "0" + onlyNumbers.substring(6, 7));	
			Input.setSelectionRange(9, 9);			
			return parseTC(Input);
	}		
	

	// ase:   44:44:44:4_   deleted a digit at the end --->  move all digits to the right

	if(Regex10.test(Input.value.trim()) && CursorPos == 10)
	{
			Input.value = eight2TC("0" + onlyNumbers);		
			return parseTC(Input);
	}
	
	
	
	// case: inserted a complete TC
	
	const Regex11 = /^\d{2}:\d{2}:\d{2}:\d{4}:\d{2}:\d{2}:\d{2}$/;
	const Regex12 = /^\d{10}:\d{2}:\d{2}:\d{2}$/;
	if((Regex11.test(Input.value.trim()) && CursorPos == 11) || (Regex12.test(Input.value.trim()) && CursorPos == 8))
	{
			Input.value = eight2TC(onlyNumbers.substring(0, 8));		
			return parseTC(Input);
	}	
	

	const Regex13 = /^\d{2}:\d{2}:\d{2}:\d{10}$/;
	if((Regex11.test(Input.value.trim()) && CursorPos == 22) || (Regex13.test(Input.value.trim()) && CursorPos == 19))
	{
			Input.value = eight2TC(onlyNumbers.substring(8, 16));		
			return parseTC(Input);
	}


	const Regex14 = /(\d{2}:\d{2}:\d{2}:\d{2})/;
	const treffer = Input.value.trim().match(Regex14)?.[0] ?? 0;
	
	if(treffer.length == 11 && Input.value.trim().length > 11)
	{
			Input.value = eight2TC(treffer.trim().replace(/\D/g, ""));		
			return parseTC(Input);
	}		

	Input.classList.add("is-invalid");
	
	return false;
}



function handle_wheel_movement(Input, Delta) {
	let resultingFrames = 0;
	
	if(Delta > 0)			// decrease
	{
		resultingFrames = TC_to_frames(Input.value) - 1;
		if(resultingFrames < 0)
		{
			if(max_hours == 24)
				resultingFrames = TC_to_frames("24:00:00:00") - 1;
			else
				resultingFrames = 0;
		}
		Input.value = frames_to_TC(resultingFrames);	
	}
	
	if(Delta < 0)			// increase
	{
		resultingFrames = TC_to_frames(Input.value) + 1;
			
		if(resultingFrames >= TC_to_frames("24:00:00:00") && max_hours == 24)
			resultingFrames = 0;
	}	
	
	Input.value = frames_to_TC(resultingFrames);	
	
	calculate(Input.parentElement);
}


function toggle_Operator(Button) {
	if(Button.innerText == "+")
		Button.innerText = "-";
	else
		Button.innerText = "+";
	calculate(Button.closest("div.input-group"));
}


function eight2TC(Input)
{
	return Input.substring(0, 2) + ":" + Input.substring(2, 4) + ":" + Input.substring(4, 6) + ":" + Input.substring(6,8);
}



function add_line() {
	const allLines = document.querySelectorAll('div.zeile');
	const lastLine = allLines[allLines.length - 1];
	const lastResult = lastLine.querySelector(".sum").value;

	if (!lastLine)
		return false;
		
	const clonedLine = lastLine.cloneNode(true);
	const parentElement = lastLine.parentElement;
	parentElement.insertBefore(clonedLine, lastLine);

	
	const allLinesWithAddedLine = document.querySelectorAll('div.zeile');
	const newLastLine = allLinesWithAddedLine[allLinesWithAddedLine.length - 1];
	const oldLastLine = allLinesWithAddedLine[allLinesWithAddedLine.length - 2];
	
	newLastLine.querySelectorAll('input.addend').forEach(input => {
		init_TC_input(input);
	});
	
	newLastLine.querySelectorAll('input.sum').forEach(output => {
		init_TC_output(output);
	});	
	

	if(lastResult.length == 11 && lastResult != "00:00:00:00")
	{
		newLastLine.querySelector(".addend").value = lastResult;
		flashField(oldLastLine.querySelector(".sum"),10);
		flashField(newLastLine.querySelector('input.addend'),200);
	}
	else	
		newLastLine.querySelector(".addend").value = "00:00:00:00";
		
	if(document.querySelectorAll('div.zeile').length % 2 == 0)		// banding
		newLastLine.classList.add('even_line');
	else
		newLastLine.classList.remove('even_line');
	
	newLastLine.querySelector('input.addend').focus();	
	parseTC(newLastLine.querySelector('input.addend'));
	parseTC(newLastLine.querySelectorAll('input.addend')[1]);
	calculate(newLastLine.querySelector("div.input-group"));
}


function flashField(inputField, delay) {							// give a hint that the last result has been copied
  
  if (inputField) {
    setTimeout(() => {
       inputField.classList.add('input-flash-blue');
    }, 10 + delay);	

    setTimeout(() => {
      inputField.classList.remove('input-flash-blue');
    }, 1600 + delay);
  }
}


function toggleManual() {

	if(document.getElementById('opManual').classList.contains('hidden'))
	{
		document.getElementById('opManual').classList.remove('hidden');
		document.getElementById('opManual_btn').classList.remove('btn-outline-secondary');
		document.getElementById('opManual_btn').classList.add('btn-secondary');	
	} else {
		document.getElementById('opManual').classList.add('hidden');
		document.getElementById('opManual_btn').classList.add('btn-outline-secondary');
		document.getElementById('opManual_btn').classList.remove('btn-secondary');	
	}
	return true;
}

function change_FPS() {

	let index = FPS_options.indexOf(framesPerSecond);
	
	if(index == FPS_options.length - 1)
		framesPerSecond = FPS_options[0];
	else
		framesPerSecond = FPS_options[index + 1];
	
	document.getElementById("FPS_btn").innerText = framesPerSecond + " FPS";
	
	document.querySelectorAll('input.addend').forEach(input => {		parseTC(input);			});				// re-evaluate inputs
	document.querySelectorAll('div.input-group').forEach(inputrow => {	calculate(inputrow);	});				// re-calculate, because result may be differen now
	return true;
}

function change_max_hours() {

	const button = document.getElementById("max_hours_btn");

	if(max_hours == 24)
	{
		max_hours = 99;
		button.innerText = "99 h";	
	} else {
		max_hours = 24;
		button.innerText = "24 h";
	}
	
	document.querySelectorAll('input.addend').forEach(input => {		parseTC(input);			});				// re-evaluate inputs
	document.querySelectorAll('div.input-group').forEach(inputrow => {	calculate(inputrow);	});				// re-calculate, because result may be differen now
	return true;
}
