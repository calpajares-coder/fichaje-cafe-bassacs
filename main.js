import './style.css'
import { db } from './firebase.js'
import { collection, addDoc } from 'firebase/firestore'

document.querySelector('#app').innerHTML = `
  <div style="padding:40px;font-family:Arial">
    <h1>Fichaje Café Bassacs</h1>

    <input id="codigo" placeholder="Código trabajador"
    style="padding:10px;margin-top:20px;width:250px"/>

    <br><br>

    <button id="entrada" style="padding:15px">
      Fichar Entrada
    </button>

    <p id="mensaje"></p>
  </div>
`

document.getElementById('entrada').addEventListener('click', async () => {

  const codigo = document.getElementById('codigo').value

  navigator.geolocation.getCurrentPosition(async (pos) => {

    await addDoc(collection(db, 'FICHAJES'), {
      codigo: codigo,
      fecha: new Date().toISOString(),
      latitud: pos.coords.latitude,
      longitud: pos.coords.longitude,
      tipo: 'entrada'
    })

    document.getElementById('mensaje').innerHTML =
      'Entrada registrada correctamente'

  })

})