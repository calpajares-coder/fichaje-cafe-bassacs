import './style.css'
import { db } from './firebase.js'
import {
  collection, addDoc, getDocs, query, where, updateDoc, doc
} from 'firebase/firestore'

const CLAVE_ADMIN = 'CALPAJARES2026'

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

  <h2>Nuevo trabajador</h2>
  <p>Si es tu primera vez, crea tu código personal.</p>
  <input id="nuevoNombre" placeholder="Nombre completo" style="padding:12px;width:100%">
  <br><br>
  <input id="nuevoCodigo" placeholder="Crea tu código personal" style="padding:12px;width:100%">
  <br><br>
  <button id="crearTrabajador">Crear mi código</button>
  <p id="mensajeRegistro"></p>

  <hr>

  <h2>Administrador</h2>
  <input id="claveAdmin" type="password" placeholder="Clave administrador" style="padding:12px;width:100%">
  <br><br>
  <button id="entrarAdmin">Entrar como administrador</button>

  <div id="panelAdmin" style="display:none;margin-top:25px">
    <h3>Trabajadores</h3>
    <button id="verEmpleados">Ver trabajadores</button>
    <ul id="listaEmpleados"></ul>

    <hr>

    <h3>Fichajes</h3>
    <button id="verFichajes">Ver fichajes</button>
    <button id="exportarExcel">Descargar Excel / CSV</button>
    <div id="tablaFichajes" style="margin-top:20px;overflow:auto"></div>
  </div>
</div>
`

async function buscarEmpleado(codigo) {
  const q = query(
    collection(db, 'empleados'),
    where('codigo', '==', codigo),
    where('activo', '==', true)
  )
  const resultado = await getDocs(q)
  if (resultado.empty) return null
  return resultado.docs[0].data()
}

document.getElementById('crearTrabajador').addEventListener('click', async () => {
  const nombre = document.getElementById('nuevoNombre').value.trim()
  const codigo = document.getElementById('nuevoCodigo').value.trim()

  if (!nombre || !codigo) {
    document.getElementById('mensajeRegistro').innerHTML = 'Falta nombre o código'
    return
  }

  const existe = await buscarEmpleado(codigo)

  if (existe) {
    document.getElementById('mensajeRegistro').innerHTML = 'Este código ya existe'
    return
  }

  await addDoc(collection(db, 'empleados'), {
    nombre,
    codigo,
    activo: true,
    creado: new Date().toISOString()
  })

  document.getElementById('mensajeRegistro').innerHTML = 'Trabajador creado correctamente'
  document.getElementById('nuevoNombre').value = ''
  document.getElementById('nuevoCodigo').value = ''
})

document.getElementById('entrarAdmin').addEventListener('click', () => {
  const clave = document.getElementById('claveAdmin').value.trim()

  if (clave === CLAVE_ADMIN) {
    document.getElementById('panelAdmin').style.display = 'block'
  } else {
    alert('Clave incorrecta')
  }
})

document.getElementById('verEmpleados').addEventListener('click', async () => {
  const resultado = await getDocs(collection(db, 'empleados'))
  const lista = document.getElementById('listaEmpleados')
  lista.innerHTML = ''

  resultado.forEach((docu) => {
    const e = docu.data()
    lista.innerHTML += `<li><strong>${e.nombre}</strong> — Código: ${e.codigo}</li>`
  })
})

document.getElementById('entrada').addEventListener('click', async () => {
  const codigo = document.getElementById('codigo').value.trim()
  const empleado = await buscarEmpleado(codigo)

  if (!empleado) {
    document.getElementById('mensaje').innerHTML = 'Código no válido. Primero crea tu código.'
    return
  }

  const q = query(
    collection(db, 'FICHAJES'),
    where('codigo', '==', codigo),
    where('abierto', '==', true)
  )

  const abierto = await getDocs(q)

  if (!abierto.empty) {
    document.getElementById('mensaje').innerHTML = 'Ya tienes una entrada abierta'
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
  }, () => {
    document.getElementById('mensaje').innerHTML = 'Debes permitir la ubicación'
  })
})

document.getElementById('salida').addEventListener('click', async () => {
  const codigo = document.getElementById('codigo').value.trim()

  const q = query(
    collection(db, 'FICHAJES'),
    where('codigo', '==', codigo),
    where('abierto', '==', true)
  )

  const resultado = await getDocs(q)

  if (resultado.empty) {
    document.getElementById('mensaje').innerHTML = 'No hay entrada abierta'
    return
  }

  const fichajeDoc = resultado.docs[0]
  const entrada = fichajeDoc.data()

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const fechaSalida = new Date()
    const fechaEntrada = new Date(entrada.fechaEntrada)
    const horas = ((fechaSalida - fechaEntrada) / 1000 / 60 / 60).toFixed(2)

    await updateDoc(doc(db, 'FICHAJES', fichajeDoc.id), {
      fechaSalida: fechaSalida.toISOString(),
      latitudSalida: pos.coords.latitude,
      longitudSalida: pos.coords.longitude,
      horasTrabajadas: horas,
      abierto: false
    })

    document.getElementById('mensaje').innerHTML = `Salida registrada. Horas: ${horas}`
  }, () => {
    document.getElementById('mensaje').innerHTML = 'Debes permitir la ubicación'
  })
})

async function cargarFichajes() {
  const resultado = await getDocs(collection(db, 'FICHAJES'))

  let html = `
  <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">
    <tr>
      <th>Nombre</th>
      <th>Código</th>
      <th>Entrada</th>
      <th>Salida</th>
      <th>Horas</th>
      <th>Abierto</th>
    </tr>
  `

  resultado.forEach((docu) => {
    const f = docu.data()
    html += `
      <tr>
        <td>${f.nombre || ''}</td>
        <td>${f.codigo || ''}</td>
        <td>${f.fechaEntrada || ''}</td>
        <td>${f.fechaSalida || ''}</td>
        <td>${f.horasTrabajadas || ''}</td>
        <td>${f.abierto ? 'Sí' : 'No'}</td>
      </tr>
    `
  })

  html += `</table>`
  document.getElementById('tablaFichajes').innerHTML = html
}

document.getElementById('verFichajes').addEventListener('click', cargarFichajes)

document.getElementById('exportarExcel').addEventListener('click', async () => {
  const resultado = await getDocs(collection(db, 'FICHAJES'))

  let csv = 'Nombre;Codigo;Entrada;Salida;Horas;Latitud Entrada;Longitud Entrada;Latitud Salida;Longitud Salida;Abierto\n'

  resultado.forEach((docu) => {
    const f = docu.data()
    csv += `${f.nombre || ''};${f.codigo || ''};${f.fechaEntrada || ''};${f.fechaSalida || ''};${f.horasTrabajadas || ''};${f.latitudEntrada || ''};${f.longitudEntrada || ''};${f.latitudSalida || ''};${f.longitudSalida || ''};${f.abierto ? 'SI' : 'NO'}\n`
  })

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fichajes_cafe_bassacs.csv'
  a.click()
})