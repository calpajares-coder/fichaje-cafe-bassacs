import './style.css'
import { db } from './firebase.js'
import {
  collection, addDoc, getDocs, query, where, updateDoc, doc
} from 'firebase/firestore'

const CLAVE_ADMIN = '1234'

document.querySelector('#app').innerHTML = `
<div style="padding:30px;font-family:Arial;max-width:900px;margin:auto">
  <h1>Fichaje Café Bassacs</h1>

  <h2>Trabajador</h2>
  <input id="codigo" placeholder="Código trabajador" style="padding:12px;width:100%">
  <br><br>
  <button id="entrada">Fichar Entrada</button>
  <button id="salida">Fichar Salida</button>
  <p id="mensaje"></p>

  <hr>

  <h2>Administrador</h2>
  <input id="claveAdmin" type="password" placeholder="Clave administrador" style="padding:12px;width:100%">
  <br><br>
  <button id="entrarAdmin">Entrar como administrador</button>

  <div id="panelAdmin" style="display:none;margin-top:20px">
    <h3>Añadir empleado</h3>
    <input id="nombreEmpleado" placeholder="Nombre empleado" style="padding:12px;width:100%">
    <br><br>
    <input id="codigoEmpleado" placeholder="Código empleado" style="padding:12px;width:100%">
    <br><br>
    <button id="guardarEmpleado">Guardar empleado</button>
    <p id="mensajeEmpleado"></p>

    <hr>

    <h3>Empleados</h3>
    <button id="verEmpleados">Ver empleados</button>
    <ul id="listaEmpleados"></ul>

    <hr>

    <h3>Fichajes</h3>
    <button id="verFichajes">Ver fichajes</button>
    <button id="exportarExcel">Descargar Excel/CSV</button>
    <div id="tablaFichajes"></div>
  </div>
</div>
`

async function buscarEmpleado(codigo) {
  const q = query(collection(db, 'empleados'), where('codigo', '==', codigo), where('activo', '==', true))
  const resultado = await getDocs(q)
  if (resultado.empty) return null
  return resultado.docs[0].data()
}

document.getElementById('entrarAdmin').addEventListener('click', () => {
  const clave = document.getElementById('claveAdmin').value
  if (clave === CLAVE_ADMIN) {
    document.getElementById('panelAdmin').style.display = 'block'
  } else {
    alert('Clave incorrecta')
  }
})

document.getElementById('guardarEmpleado').addEventListener('click', async () => {
  const nombre = document.getElementById('nombreEmpleado').value.trim()
  const codigo = document.getElementById('codigoEmpleado').value.trim()

  if (!nombre || !codigo) {
    document.getElementById('mensajeEmpleado').innerHTML = 'Falta nombre o código'
    return
  }

  await addDoc(collection(db, 'empleados'), { nombre, codigo, activo: true })
  document.getElementById('mensajeEmpleado').innerHTML = 'Empleado guardado correctamente'
})

document.getElementById('verEmpleados').addEventListener('click', async () => {
  const resultado = await getDocs(collection(db, 'empleados'))
  const lista = document.getElementById('listaEmpleados')
  lista.innerHTML = ''

  resultado.forEach((docu) => {
    const e = docu.data()
    lista.innerHTML += `<li><strong>${e.nombre}</strong> - Código: ${e.codigo}</li>`
  })
})

document.getElementById('entrada').addEventListener('click', async () => {
  const codigo = document.getElementById('codigo').value.trim()
  const empleado = await buscarEmpleado(codigo)

  if (!empleado) {
    document.getElementById('mensaje').innerHTML = 'Código no válido'
    return
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    await addDoc(collection(db, 'FICHAJES'), {
      codigo,
      nombre: empleado.nombre,
      fechaEntrada: new Date().toISOString(),
      latitudEntrada: pos.coords.latitude,
      longitudEntrada: pos.coords.longitude,
      abierto: true
    })

    document.getElementById('mensaje').innerHTML = 'Entrada registrada correctamente'
  })
})

document.getElementById('salida').addEventListener('click', async () => {
  const codigo = document.getElementById('codigo').value.trim()
  const q = query(collection(db, 'FICHAJES'), where('codigo', '==', codigo), where('abierto', '==', true))
  const resultado = await getDocs(q)

  if (resultado.empty) {
    document.getElementById('mensaje').innerHTML = 'No hay entrada abierta'
    return
  }

  const fichajeDoc = resultado.docs[0]

  navigator.geolocation.getCurrentPosition(async (pos) => {
    await updateDoc(doc(db, 'FICHAJES', fichajeDoc.id), {
      fechaSalida: new Date().toISOString(),
      latitudSalida: pos.coords.latitude,
      longitudSalida: pos.coords.longitude,
      abierto: false
    })

    document.getElementById('mensaje').innerHTML = 'Salida registrada correctamente'
  })
})

async function cargarFichajes() {
  const resultado = await getDocs(collection(db, 'FICHAJES'))
  let html = `<table border="1" cellpadding="8"><tr><th>Nombre</th><th>Código</th><th>Entrada</th><th>Salida</th><th>Abierto</th></tr>`

  resultado.forEach((docu) => {
    const f = docu.data()
    html += `<tr>
      <td>${f.nombre || ''}</td>
      <td>${f.codigo || ''}</td>
      <td>${f.fechaEntrada || ''}</td>
      <td>${f.fechaSalida || ''}</td>
      <td>${f.abierto ? 'Sí' : 'No'}</td>
    </tr>`
  })

  html += `</table>`
  document.getElementById('tablaFichajes').innerHTML = html
}

document.getElementById('verFichajes').addEventListener('click', cargarFichajes)

document.getElementById('exportarExcel').addEventListener('click', async () => {
  const resultado = await getDocs(collection(db, 'FICHAJES'))

  let csv = 'Nombre;Codigo;Entrada;Salida;Latitud entrada;Longitud entrada;Latitud salida;Longitud salida;Abierto\\n'

  resultado.forEach((docu) => {
    const f = docu.data()
    csv += `${f.nombre || ''};${f.codigo || ''};${f.fechaEntrada || ''};${f.fechaSalida || ''};${f.latitudEntrada || ''};${f.longitudEntrada || ''};${f.latitudSalida || ''};${f.longitudSalida || ''};${f.abierto ? 'SI' : 'NO'}\\n`
  })

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fichajes_cafe_bassacs.csv'
  a.click()
})