'use strict';

const formInsert = document.querySelector('.form__insert');
const formEdit = document.querySelector('.form__edit');
const deleteWorkouts = document.querySelector('.btn__delete--workouts');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const formEditTitle = document.querySelector('.form__edit__title');
const inputTypeEdit = document.querySelector('.form__input--type--edit');
const inputDistanceEdit = document.querySelector(
  '.form__input--distance--edit'
);
const inputDurationEdit = document.querySelector(
  '.form__input--duration--edit'
);
const inputCadenceEdit = document.querySelector('.form__input--cadence--edit');
const inputElevationEdit = document.querySelector(
  '.form__input--elevation--edit'
);
const idWorkoutEdit = document.querySelector('.workout--id--edit');

// ACTUAL CODE

class Workout {
  date = new Date();
  id = (
    Math.floor(Math.random() * 200000000000) +
    Date.now() +
    Math.floor(Math.random() * 200000000000) +
    ''
  ).slice(-20);
  clicks = 0;

  constructor(distance, duration, coords) {
    this.distance = distance; // in km
    this.duration = duration; // in min
    this.coords = coords; // [lat, lng]
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, cadence, pace) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.#calcPace();
    this._setDescription();
  }

  #calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, elevation, speed) {
    super(distance, duration, coords);
    this.elevation = elevation;
    this.#calcSpeed();
    this._setDescription();
  }

  #calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// APPLICATION ARCHTECTURE
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoom = 13;

  constructor() {
    // The constructor is loaded imediatly as the page loads, so calling a method here makes it be called automatically
    // Get users position
    this.#getPosition();

    // Get data from local storage
    this.#getLocalStorage();

    // Workout input form
    formInsert.addEventListener('submit', this.#newWorkout.bind(this));

    // Workout edit input form
    formEdit.addEventListener('submit', this.#editWorkout.bind(this));

    // Delete all workouts
    deleteWorkouts.addEventListener('click', this.#reset.bind(this));

    // Toogling cadence/elevation
    inputType.addEventListener('change', this.#toogleElevationField);

    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));

    // Deleting workouts
    containerWorkouts.addEventListener('click', this.#deleteWorkout.bind(this));

    // Editing workouts
    containerWorkouts.addEventListener('click', this.#findWorkout.bind(this));
  }

  // Method that gets the current position
  #getPosition() {
    // Starting map and geologation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // This if current location is found
        this.#loadMap.bind(this),
        // this if its not
        function () {
          alert(`Could not find your location`);
        }
      );
    }
  }

  // Method to load map in the current position
  #loadMap(position) {
    // Getting current coords
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    // Defining the where the map should be
    this.#map = L.map('map').setView(coords, this.#mapZoom);

    // Defining the map
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords, { riseOnHover: true })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 300,
          maxHeight: 300,
          //keepInView: true,
          autoClose: false,
          closeOnClick: false,
          className: 'running-popup',
        })
      )
      .setPopupContent(`<p>You are here!</p>`)
      .openPopup();

    // opening form for the marker
    this.#map.on('click', this.#showForm.bind(this));

    this.#workouts.forEach(work => {
      this.#renderWorkoutMarker(work);
    });
  }

  #showDeleteWorkouts() {
    if (this.#workouts !== []) {
      deleteWorkouts.classList.remove('hidden');
    }
  }

  #showForm(mapE) {
    this.#hideEditForm();
    this.#mapEvent = mapE;
    formInsert.classList.remove('hidden');
    inputDistance.focus();
  }

  #showFormEdit(workout) {
    this.#hideForm();
    formEdit.classList.remove('hidden');

    formEditTitle.textContent = `Editing: ${workout.description}`;
    inputTypeEdit.value = workout.type;
    inputDistanceEdit.value = workout.distance;
    inputDurationEdit.value = workout.duration;
    idWorkoutEdit.value = workout.id;

    if (workout.type === 'cycling') {
      inputCadenceEdit.parentElement.classList.add('form__row--hidden');
      inputElevationEdit.parentElement.classList.remove('form__row--hidden');
      inputElevationEdit.value = workout.elevation;
    } else {
      inputElevationEdit.parentElement.classList.add('form__row--hidden');
      inputCadenceEdit.parentElement.classList.remove('form__row--hidden');
      inputCadenceEdit.value = workout.cadence;
    }
    // formEdit.addEventListener('submit', this.#editWorkout(workout));
  }

  #editWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const workId = idWorkoutEdit.value;
    const workout = this.#workouts.find(work => work.id === workId);

    const type = workout.type;
    const distance = +inputDistanceEdit.value;
    const duration = +inputDurationEdit.value;

    if (type === 'running') {
      const cadence = +inputCadenceEdit.value;
      // Check if data is valid
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers');
      } else {
        workout.distance = distance;
        workout.duration = duration;
        workout.cadence = cadence;
      }
    } else if (type === 'cycling') {
      const elevation = +inputElevationEdit.value;
      // Check if data is valid
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers');
      } else {
        workout.distance = distance;
        workout.duration = duration;
        workout.elevation = elevation;
      }
    }

    // Seting local storage
    this.#setLocalStorage();

    // Hiding edit form
    this.#hideEditForm();

    // Showing new list
    location.reload();
  }

  #hideForm() {
    // Clear input fields
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    formInsert.style.display = 'none';
    formInsert.classList.add('hidden');
    setTimeout(() => (formInsert.style.display = 'grid')), 1000;
  }

  #hideEditForm() {
    inputDistanceEdit.value =
      inputDurationEdit.value =
      inputElevationEdit.value =
      inputCadenceEdit.value =
        '';

    formEdit.style.display = 'none';
    formEdit.classList.add('hidden');
    setTimeout(() => (formEdit.style.display = 'grid')), 1000;
  }

  #toogleElevationField() {
    inputElevation.parentElement.classList.toggle('form__row--hidden');
    inputCadence.parentElement.classList.toggle('form__row--hidden');
  }

  #newWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If activity is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running(distance, duration, [lat, lng], cadence);
    }

    // If activity is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map
    this.#renderWorkoutMarker(workout);

    // Render workout list
    this.#renderWorkout(workout);

    // Hide form
    this.#hideForm();

    // Hide edit form
    this.#hideEditForm();

    // Set local storage for all workouts
    this.#setLocalStorage();
  }

  #renderWorkoutMarker(workout) {
    L.marker(workout.coords, { riseOnHover: true })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 300,
          maxHeight: 300,
          //keepInView: true,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">
        <p class="title__description">
          ${workout.description}
        </p>
        <span class="workout__btns">
          <button class="workout__btn workout__edit">✏️</button>
          <button class="workout__btn workout__trash">🗑️</button>
        </span>
      </h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃' : '🚴'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${Math.floor(workout.pace)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    } else if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }
    // Add workout after form
    formEdit.insertAdjacentHTML('afterend', html);

    // Show button to delete all workouts
    this.#showDeleteWorkouts();
  }

  #moveToPopup(e) {
    const workoutEl = e.target.closest('.workout').getAttribute('data-id');
    if (!workoutEl) return;

    const workout = this.#workouts.find(work => work.id === workoutEl);

    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this.#renderWorkout(work);
    });
  }

  #findWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    const workoutEdit = e.target.classList.contains('workout__edit');

    if (!workoutEl || !workoutEdit) return;
    const workId = workoutEl.getAttribute('data-id');

    const workout = this.#workouts.find(work => work.id === workId);
    console.log(workout);

    this.#showFormEdit(workout);
  }

  #deleteWorkout(e) {
    const workoutEl = e.target.closest('.workout').getAttribute('data-id');
    const workoutDelete = e.target.classList.contains('workout__trash');

    if (!workoutEl || !workoutDelete) return;

    const workout = this.#workouts.find(work => work.id === workoutEl);

    const index = this.#workouts.indexOf(workout);
    this.#workouts.splice(index, 1);

    localStorage.setItem('workouts', JSON.stringify(this.#workouts));

    // Showing new list
    location.reload();
    this.#getLocalStorage();
  }

  #reset() {
    localStorage.removeItem('workouts');
    // Location is an object of the browser that contains many functions, such as ".reload()", that reloads the page
    location.reload();
  }
}

const app = new App();

//
//
//

//
//
//

//
//
//

// THIS IS GOING ON YOUR PORTIFOLIO BOYO

// BUILDING FLOW CHARTS
// TO CREATE FLOW CHARTS, MANY ENTERPRISES USE "USER STORIES", BASICALLY, A PARAGRAPH CONTAINING A DESCRIPTION OF THE APPLICATION'S FUNCTIONALITY FROM THE USER'S PERSPECTIVE
// FROM THOSE "USER STORIES", IT IS DETERMINED WHAT THE APP SHOULD BE ABLE TO DO, THEN, DEVS COME UP WITH FEATURES THAT WILL MAKE THE PROPOSAL OF THE APPLICATION POSSIBLE
// THESE FEATURES AND THEIR INTERACTIONS WITH THE APP ARE THEN PUT INTO A FLOW CHART
// UNTIL NOW, IT HAS BEEN DECIDED WHAT WILL BE DONE, FROM NOW ON, THERE WILL BE DECIDED HOW THESE FEATURES COME INTO PLACE, HOW THE CODE WILL BE ORGANIZED AND WHAT JS FEATURES WILL BE USED, THIS STEP IS OFTEN CALLED "ARCHITECTURE"
// AFTER ALL HAS BEEN DECIDED, THE DEVELOPING PHASE

//
//
//

// GEOLOCATION API MY MAN
// GEOLOCATION API IS SO CALLED BECAUSE IT IS AN BROWSER API, JUST LIKE THE INTERNALIZATION API

// To use the geolocation browser API, just use this:

/*
if (navigator.geolocation) {
  // This if is here for compatibility with old browsers, it makes it so the function only runs if the geolocation function exists
  navigator.geolocation.getCurrentPosition(
    function (position) {
      //console.log(`Found your location:`, position);
      const { latitude } = position.coords;
      const { longitude } = position.coords;
      const coords = [latitude, longitude];
      // YOU CAN MAKE A GOOGLE MAPS LINK WITH THIS
      //console.log(`https://www.google.com.br/maps/@${latitude},${longitude}`);

      // THIS IS FROM THE LEAFLET APPPLICATION, IT DOES MAPS AND STUFF, SUPER COOL, YOU SHOULD LOOK INTO THAT
      const map = L.map('map').setView(coords, 13);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.marker(coords, { riseOnHover: true })
        .addTo(map)
        .bindPopup(
          L.popup({
            minWidth: 100,
            maxWidth: 300,
            maxHeight: 300,
            //keepInView: true,
            autoClose: false,
            closeOnClick: false,
            className: 'running-popup',
          })
        )
        .setPopupContent(`<p>Working out and stuff</p>`)
        .openPopup();

      // this ".on()" function comes from the leaflet application, and it can be used as an eventListener in specific parts of the map
      map.on('click', function (mapEvent) {
        const { lat, lng } = mapEvent.latlng;
        const newCoords = { lat, lng };

        L.marker(newCoords, { riseOnHover: true })
          .addTo(map)
          .bindPopup(
            L.popup({
              minWidth: 100,
              maxWidth: 300,
              maxHeight: 300,
              //keepInView: true,
              autoClose: false,
              closeOnClick: false,
              className: 'running-popup',
            })
          )
          .setPopupContent(`<p>Working out and stuff</p>`)
          .openPopup();
      });
    },
    function () {
      alert(`Could not find your location`);
    }
  );
}
*/

// This function takes to callback inputs, the first one is called when the browser successfully finds the location of the computer, the second is for when the location could not be found
// The function for successifully finding out the location comes with a parameter, that parameter is said position

// IF YOU DEFINE A VARIABLE IN A SCRIPT DOC, IT CAN BE ACCESSED BY OTHER SCRIPT DOCS IF THEY ARE BELLOW IT IN THE HTML HEAD
