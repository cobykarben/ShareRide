const state = {
  events: [
    { id: 'e1', name: 'Midtown Arena: The Lumens', type: 'concert', city: 'Austin', date: '2025-11-08', description: 'Indie rock tour stop', lat: 30.27, lng: -97.74 },
    { id: 'e2', name: 'Tech Future Conf', type: 'conference', city: 'San Jose', date: '2025-11-15', description: 'Emerging tech summit', lat: 37.33, lng: -121.89 },
    { id: 'e3', name: 'City Derby Finals', type: 'sports', city: 'Chicago', date: '2025-12-01', description: 'Championship game', lat: 41.88, lng: -87.63 },
    { id: 'e4', name: 'Riverfront Music Fest', type: 'festival', city: 'Nashville', date: '2025-11-20', description: 'All-day outdoor festival', lat: 36.16, lng: -86.78 },
    { id: 'e5', name: 'Frontend Meetup Night', type: 'meetup', city: 'New York', date: '2025-11-02', description: 'Community meetup', lat: 40.71, lng: -74.0 },
  ],
  rides: [
    { id: 'r1', eventId: 'e1', driver: 'Dana', vehicle: 'Sedan • Blue Corolla', departure: 'Downtown Austin', time: '2025-11-08T16:30:00', price: 12, seats: 4, seatMap: ['A1','A2','B1','B2'], occupied: ['A1'] },
    { id: 'r2', eventId: 'e1', driver: 'Sam', vehicle: 'SUV • Black RAV4', departure: 'UT Campus', time: '2025-11-08T17:00:00', price: 14, seats: 5, seatMap: ['A1','A2','B1','B2','C1'], occupied: ['B2','C1'] },
    { id: 'r3', eventId: 'e2', driver: 'Lee', vehicle: 'Minivan • Odyssey', departure: 'Downtown SJ', time: '2025-11-15T08:00:00', price: 10, seats: 6, seatMap: ['A1','A2','B1','B2','C1','C2'], occupied: [] },
  ],
  selectedEventId: null,
  selectedRideId: null,
  selectedSeat: null,
};

const el = {
  year: document.getElementById('year'),
  typeFilter: document.getElementById('typeFilter'),
  searchInput: document.getElementById('searchInput'),
  dateInput: document.getElementById('dateInput'),
  searchBtn: document.getElementById('searchBtn'),
  eventList: document.getElementById('eventList'),
  rideList: document.getElementById('rideList'),
  ridesSubtitle: document.getElementById('ridesSubtitle'),
  seatSection: document.getElementById('seatSection'),
  seatPanel: document.getElementById('seatPanel'),
  seatMap: document.getElementById('seatMap'),
  seatRideTitle: document.getElementById('seatRideTitle'),
  selectedSeat: document.getElementById('selectedSeat'),
  applyBtn: document.getElementById('applyBtn'),
  modal: document.getElementById('modal'),
  cancelModal: document.getElementById('cancelModal'),
  confirmApply: document.getElementById('confirmApply'),
  applyNote: document.getElementById('applyNote'),
  seatSubtitle: document.getElementById('seatSubtitle'),
};

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function renderEvents() {
  const q = (el.searchInput.value || '').toLowerCase();
  const t = el.typeFilter.value;
  const day = el.dateInput.value;
  const items = state.events.filter(e => {
    const matchesQ = !q || `${e.name} ${e.type} ${e.city}`.toLowerCase().includes(q);
    const matchesT = !t || e.type === t;
    const matchesD = !day || e.date === day;
    return matchesQ && matchesT && matchesD;
  });

  el.eventList.innerHTML = items.map(e => `
    <article class="card" role="listitem" tabindex="0" data-event-id="${e.id}">
      <div class="title">${e.name}</div>
      <div class="meta">${e.city} • ${e.type} • ${new Date(e.date).toLocaleDateString()}</div>
      <p class="muted">${e.description}</p>
      <div class="card-actions">
        <div class="chips">
          <span class="chip">${e.type}</span>
          <span class="chip">${e.city}</span>
        </div>
        <button class="button ghost" data-view-rides>View rides</button>
      </div>
    </article>
  `).join('');
}

function renderRides() {
  const eventId = state.selectedEventId;
  const rides = state.rides.filter(r => !eventId || r.eventId === eventId);
  if (eventId) {
    const ev = state.events.find(e => e.id === eventId);
    el.ridesSubtitle.textContent = `Available rides for ${ev?.name || ''}`;
  } else {
    el.ridesSubtitle.textContent = 'Select an event to view available rides.';
  }
  el.rideList.innerHTML = rides.map(r => `
    <article class="card" role="listitem" tabindex="0" data-ride-id="${r.id}">
      <div class="title">${r.vehicle}</div>
      <div class="meta">Driver: ${r.driver} • Departs: ${fmtDate(r.time)}</div>
      <div class="chips">
        <span class="chip available">${r.seatMap.length - r.occupied.length} open</span>
        <span class="chip">From: ${r.departure}</span>
      </div>
      <div class="card-actions">
        <div class="price">$${r.price} / person</div>
        <button class="button primary" data-view-seats>View seats</button>
      </div>
    </article>
  `).join('');
}

function renderSeatMap() {
  const ride = state.rides.find(r => r.id === state.selectedRideId);
  if (!ride) return;
  el.seatPanel.classList.remove('hidden');
  el.seatSubtitle.textContent = '';
  el.seatRideTitle.textContent = ride.vehicle;
  el.selectedSeat.textContent = state.selectedSeat ? `Selected: ${state.selectedSeat}` : 'No seat selected';
  el.applyBtn.disabled = !state.selectedSeat;

  const taken = new Set(ride.occupied);
  el.seatMap.innerHTML = ride.seatMap.map(label => {
    let cls = 'available';
    if (taken.has(label)) cls = 'occupied';
    const selected = state.selectedSeat === label ? ' selected' : '';
    return `<button class="seat ${cls}${selected}" data-seat="${label}" aria-label="Seat ${label}">${label}</button>`;
  }).join('');
}

function applyEvents() {
  el.eventList.addEventListener('click', e => {
    const card = e.target.closest('[data-event-id]');
    if (!card) return;
    if (e.target.matches('[data-view-rides]')) {
      state.selectedEventId = card.getAttribute('data-event-id');
      state.selectedRideId = null;
      state.selectedSeat = null;
      renderRides();
      el.seatPanel.classList.add('hidden');
      document.getElementById('rides').scrollIntoView({ behavior: 'smooth' });
    }
  });

  el.rideList.addEventListener('click', e => {
    const card = e.target.closest('[data-ride-id]');
    if (!card) return;
    if (e.target.matches('[data-view-seats], .button.primary')) {
      state.selectedRideId = card.getAttribute('data-ride-id');
      state.selectedSeat = null;
      renderSeatMap();
      document.getElementById('seatSection').scrollIntoView({ behavior: 'smooth' });
    }
  });

  el.seatMap.addEventListener('click', e => {
    const btn = e.target.closest('[data-seat]');
    if (!btn) return;
    if (btn.classList.contains('occupied') || btn.classList.contains('reserved')) return;
    const label = btn.getAttribute('data-seat');
    state.selectedSeat = state.selectedSeat === label ? null : label;
    renderSeatMap();
  });

  el.applyBtn.addEventListener('click', () => {
    el.modal.classList.remove('hidden');
    el.applyNote.value = '';
    document.body.style.overflow = 'hidden';
  });
  el.cancelModal.addEventListener('click', closeModal);
  el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });
  el.confirmApply.addEventListener('click', () => {
    // Demo: mark the selected seat as occupied and show success
    const ride = state.rides.find(r => r.id === state.selectedRideId);
    if (ride && state.selectedSeat && !ride.occupied.includes(state.selectedSeat)) {
      ride.occupied.push(state.selectedSeat);
    }
    closeModal();
    state.selectedSeat = null;
    renderSeatMap();
    alert('Application submitted! (demo)');
  });

  el.searchBtn.addEventListener('click', () => {
    renderEvents();
  });
}

function closeModal() {
  el.modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function init() {
  el.year.textContent = new Date().getFullYear();
  renderEvents();
  renderRides();
  applyEvents();
}

init();


