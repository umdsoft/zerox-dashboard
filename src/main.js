import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/index.css';
// FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
// fa-free-solid’dan F R E E ikonlar
import { faUsers, faWallet, faFileInvoice, faCalendarDays } from '@fortawesome/free-solid-svg-icons'

// kerakli ikonlarni kutubxonaga qo‘shamiz
library.add(faUsers, faWallet, faFileInvoice, faCalendarDays)

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.component('fa', FontAwesomeIcon)

app.mount('#app');
