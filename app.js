const { useState, useEffect } = React;

function App() {
  // === 1. DETECCIÓN DEL LINK DEL QR ===
  const urlParams = new URLSearchParams(window.location.search);
  const urlEventoId = urlParams.get('asistencia');
  const [qrEventoId, setQrEventoId] = useState(urlEventoId);

  const [pantallaActual, setPantallaActual] = useState(() => {
    return localStorage.getItem('pantallaFime') || 'validacion';
  });
  const [numEmpleado, setNumEmpleado] = useState('');
  const [error, setError] = useState('');
  
  const [cargando, setCargando] = useState(false);
  const [nombreMaestro, setNombreMaestro] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  
  const [esAdmin, setEsAdmin] = useState(() => {
    return localStorage.getItem('esAdminFime') === 'true';
  });

  const [listaDirectorio, setListaDirectorio] = useState([]);
  const [listaEventos, setListaEventos] = useState([]);
  
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cambiosDirectorio, setCambiosDirectorio] = useState([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);

  const [mostrarPopup, setMostrarPopup] = useState(false);
  
  // ESTADOS DE ASISTENCIAS
  const [preRegistradosEvento, setPreRegistradosEvento] = useState([]);
  const [asistentesFinalesEvento, setAsistentesFinalesEvento] = useState([]); // Nueva tabla
  const [yaRegistrado, setYaRegistrado] = useState(false);

  // ESTADOS DEL QR Y CONFIRMACIÓN FINAL
  const [mostrarModalQR, setMostrarModalQR] = useState(false);
  const [linkQRDinamico, setLinkQRDinamico] = useState('');
  const [confirmacionExitosa, setConfirmacionExitosa] = useState(false);

  const [formEvento, setFormEvento] = useState({ titulo: '', descripcion: '', fecha: '', hora: '', portada: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' });
  const [editandoEventoId, setEditandoEventoId] = useState(null);

  useEffect(() => {
    localStorage.setItem('pantallaFime', pantallaActual);
    localStorage.setItem('esAdminFime', esAdmin);
  }, [pantallaActual, esAdmin]);

  useEffect(() => {
    if (pantallaActual === 'admin_eventos' || pantallaActual === 'eventos') {
      obtenerEventos();
    }
    
    if (esAdmin && (pantallaActual === 'admin_maestros' || pantallaActual === 'admin_asistencia_evento')) {
      obtenerMaestros();
    }
  }, [pantallaActual, esAdmin]);

  const obtenerMaestros = async () => {
    try {
      const snapshot = await db.collection('directorio_fime').get();
      const maestrosArreglo = snapshot.docs.map(doc => ({
        id: doc.id,
        nombreCompleto: doc.data().nombreCompleto || '',
        trayectoria: doc.data().trayectoria || '',
        registrado: doc.data().registrado || false
      }));
      setListaDirectorio(maestrosArreglo);
    } catch (err) {
      console.error("Error al traer maestros:", err);
    }
  };

  const obtenerEventos = async () => {
    try {
      const snapshot = await db.collection('eventos_fime').get();
      const eventosArreglo = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setListaEventos(eventosArreglo);
    } catch (err) {
      console.error("Error al traer eventos:", err);
    }
  };

  const manejarValidacion = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    const inputLimpio = numEmpleado.trim();

    try {
      const configRef = db.collection('config').doc('admin_auth');
      const configSnap = await configRef.get();

      if (configSnap.exists) {
        const adminData = configSnap.data();
        if (inputLimpio === adminData.claveAdmin) {
          setNombreMaestro(adminData.nombreAdmin || 'Administrador');
          setEsAdmin(true);
          setPantallaActual('registro');
          setCargando(false);
          return;
        }
      }

      const docRef = db.collection('directorio_fime').doc(inputLimpio);
      const docSnap = await docRef.get(); 

      if (docSnap.exists) {
        const datos = docSnap.data();
        setNombreMaestro(datos.nombreCompleto);
        setEsAdmin(false); 
        
        // AQUÍ ESTÁ LA MAGIA: Si hay un QR activo en el link, lo mandamos a la pantalla especial
        if (qrEventoId) {
          setPantallaActual('confirmar_asistencia');
        } else {
          setPantallaActual('registro');
        }
      } else {
        setError('Número de empleado o clave de acceso no reconocido.');
      }
    } catch (err) {
      console.error("Error al consultar:", err);
      setError('Error de conexión con la base de datos.');
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem('pantallaFime');
    localStorage.removeItem('esAdminFime');
    setPantallaActual('validacion');
    setNumEmpleado('');
    setNombreMaestro('');
    setEsAdmin(false);
    setMenuAbierto(false);
    setModoEdicion(false);
    setMostrarPopup(false);
    setConfirmacionExitosa(false);
  };

  const navegarA = (pantalla) => {
    setPantallaActual(pantalla);
    setMenuAbierto(false);
    setModoEdicion(false); 
    setEditandoEventoId(null);
    setMostrarPopup(false);
  };

  // ==========================================
  // FUNCIONES DE ADMIN
  // ==========================================
  const abrirAsistenciasAdmin = async (evento) => {
    setEventoSeleccionado(evento);
    setCargando(true);
    try {
      // Cargamos pre-asistencias
      const snapshotPre = await db.collection('pre_asistencias').where('eventoId', '==', evento.id).get();
      const listaPre = snapshotPre.docs.map(doc => doc.data().numEmpleado);
      setPreRegistradosEvento(listaPre);

      // Cargamos asistencias finales (La firma real)
      const snapshotAsis = await db.collection('asistencias').where('eventoId', '==', evento.id).get();
      const listaAsis = snapshotAsis.docs.map(doc => doc.data().numEmpleado);
      setAsistentesFinalesEvento(listaAsis);

      navegarA('admin_asistencia_evento');
    } catch (err) {
      console.error("Error al cargar registros:", err);
      alert("Hubo un error al cargar los registros.");
    }
    setCargando(false);
  };

  const abrirModalQR = (evento) => {
    // Genera el link exacto donde esté alojada tu página y le pega el ID del evento
    const baseUrl = window.location.origin + window.location.pathname;
    const qrLink = `${baseUrl}?asistencia=${evento.id}`;
    
    setLinkQRDinamico(qrLink);
    setEventoSeleccionado(evento);
    setMostrarModalQR(true);
  };

  // ==========================================
  // FLUJO DE CONFIRMACIÓN FINAL (QR SCANEADO)
  // ==========================================
  const registrarAsistenciaFinal = async () => {
    setCargando(true);
    try {
      const docIdUnico = `${qrEventoId}_${numEmpleado}`;
      const docRef = db.collection('asistencias').doc(docIdUnico);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        alert("Ya habías confirmado tu asistencia a este evento anteriormente.");
      } else {
        // Registramos la firma en la nube
        await docRef.set({
          eventoId: qrEventoId,
          numEmpleado: numEmpleado,
          nombreMaestro: nombreMaestro,
          fechaFirma: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Activamos la vista de éxito
        setConfirmacionExitosa(true);

        // A los 3.5 segundos, limpiamos el link y lo sacamos
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          setQrEventoId(null);
          cerrarSesion();
        }, 3500);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al firmar.");
    }
    setCargando(false);
  };

  // ==========================================
  // FUNCIONES DE USUARIO Y EVENTOS
  // ==========================================
  const abrirDetalleEventoUsuario = async (evento) => {
    setEventoSeleccionado(evento);
    setCargando(true);
    try {
      const docIdUnico = `${evento.id}_${numEmpleado}`;
      const docSnap = await db.collection('pre_asistencias').doc(docIdUnico).get();
      setYaRegistrado(docSnap.exists);
      navegarA('detalle_evento');
    } catch (err) {
      console.error("Error al verificar registro:", err);
      navegarA('detalle_evento');
    }
    setCargando(false);
  };

  const registrarPreAsistencia = async () => {
    if (!eventoSeleccionado) return;
    setCargando(true);
    
    try {
      const docIdUnico = `${eventoSeleccionado.id}_${numEmpleado}`;
      const docRef = db.collection('pre_asistencias').doc(docIdUnico);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        alert("⚠️ Ya te encuentras registrado para este evento.");
        setYaRegistrado(true);
      } else {
        await docRef.set({
          eventoId: eventoSeleccionado.id,
          numEmpleado: numEmpleado,
          nombreMaestro: nombreMaestro,
          fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        setYaRegistrado(true);
        setMostrarPopup(true); 
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error de conexión al intentar registrar tu asistencia.");
    }
    setCargando(false);
  };

  // (FUNCIONES DE EDICIÓN Y GUARDADO DE TABLA/EVENTOS SE MANTIENEN INTACTAS)
  const iniciarEdicion = () => { setCambiosDirectorio(JSON.parse(JSON.stringify(listaDirectorio))); setModoEdicion(true); };
  const cancelarEdicion = () => { setModoEdicion(false); setCambiosDirectorio([]); };
  const handleCambioInput = (index, campo, valor) => { const nuevaLista = [...cambiosDirectorio]; nuevaLista[index][campo] = valor; setCambiosDirectorio(nuevaLista); };
  const agregarFila = () => { setCambiosDirectorio([...cambiosDirectorio, { id: '', nombreCompleto: '', trayectoria: '', registrado: false }]); };
  const eliminarFila = (index) => { const nuevaLista = [...cambiosDirectorio]; nuevaLista.splice(index, 1); setCambiosDirectorio(nuevaLista); };

  const guardarCambios = async () => {
    setCargando(true);
    try {
      const batch = db.batch();
      const eliminados = listaDirectorio.filter(orig => !cambiosDirectorio.some(c => c.id === orig.id));
      eliminados.forEach(emp => { batch.delete(db.collection('directorio_fime').doc(emp.id)); });
      cambiosDirectorio.forEach(emp => {
         if(emp.id && emp.id.trim() !== '') {
           const docRef = db.collection('directorio_fime').doc(emp.id.trim());
           batch.set(docRef, { nombreCompleto: emp.nombreCompleto, trayectoria: emp.trayectoria || '', registrado: emp.registrado || false }, { merge: true });
         }
      });
      await batch.commit(); 
      setListaDirectorio(cambiosDirectorio);
      setModoEdicion(false);
      alert("✅ Cambios guardados con éxito.");
    } catch (err) { alert("❌ Error al guardar: " + err.message); }
    setCargando(false);
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    if (!formEvento.titulo || !formEvento.fecha) { alert("Por favor completa al menos el título y la fecha."); return; }
    if (editandoEventoId) {
      const confirmacion = window.confirm("⚠️ Al modificar este evento, se borrarán las pre-asistencias actuales para obligar a los docentes a confirmar con los nuevos datos. ¿Deseas continuar?");
      if (!confirmacion) return;
    }
    setCargando(true);
    try {
      if (editandoEventoId) {
        await db.collection('eventos_fime').doc(editandoEventoId).update({ titulo: formEvento.titulo, descripcion: formEvento.descripcion, fecha: formEvento.fecha, hora: formEvento.hora, portada: formEvento.portada });
        const snapshotPre = await db.collection('pre_asistencias').where('eventoId', '==', editandoEventoId).get();
        if (!snapshotPre.empty) {
          const batch = db.batch();
          snapshotPre.docs.forEach((doc) => { batch.delete(doc.ref); });
          await batch.commit(); 
        }
        alert("✅ ¡Evento actualizado y pre-asistencias reiniciadas con éxito!");
      } else {
        await db.collection('eventos_fime').add({ titulo: formEvento.titulo, descripcion: formEvento.descripcion, fecha: formEvento.fecha, hora: formEvento.hora, portada: formEvento.portada, creado: firebase.firestore.FieldValue.serverTimestamp() });
        alert("✅ ¡Evento creado con éxito!");
      }
      setFormEvento({ titulo: '', descripcion: '', fecha: '', hora: '', portada: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' });
      setEditandoEventoId(null);
      navegarA('admin_eventos');
    } catch (err) { alert("❌ Error al guardar evento: " + err.message); }
    setCargando(false);
  };

  const eliminarEvento = async () => {
    if (!editandoEventoId) return;
    const confirmacion = window.confirm("⚠️ Avisar a las personas registradas que el evento se eliminará permanentemente ya sea para algún cambio o su eliminación total");
    if (confirmacion) {
      setCargando(true);
      try {
        await db.collection('eventos_fime').doc(editandoEventoId).delete();
        alert("🗑️ El evento ha sido eliminado permanentemente de la base de datos.");
        setEditandoEventoId(null);
        navegarA('admin_eventos');
      } catch (err) { alert("❌ Error al eliminar el evento: " + err.message); }
      setCargando(false);
    }
  };

  const prepararEdicionEvento = (evento) => {
    setFormEvento({ titulo: evento.titulo || '', descripcion: evento.descripcion || '', fecha: evento.fecha || '', hora: evento.hora || '', portada: evento.portada || '' });
    setEditandoEventoId(evento.id);
    setPantallaActual('registrar_evento');
  };

  const themeBg = esAdmin ? 'bg-sky-500' : 'bg-fime-main';
  const themeHover = esAdmin ? 'hover:bg-sky-600' : 'hover:bg-fime-dark';
  const themeDarkBg = esAdmin ? 'bg-sky-900' : 'bg-fime-dark';
  const themeText = esAdmin ? 'text-sky-600' : 'text-fime-main';
  const themeTextDark = esAdmin ? 'text-sky-900' : 'text-fime-dark';
  const themeBorder = esAdmin ? 'border-sky-500' : 'border-fime-main';
  const themeLightBg = esAdmin ? 'bg-sky-100' : 'bg-green-100';

  // ==============================================================
  // PANTALLAS DE INICIO (PANTALLA COMPLETA, SIN MENÚ)
  // ==============================================================
  if (pantallaActual === 'validacion' || pantallaActual === 'registro' || pantallaActual === 'confirmar_asistencia') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        
        {pantallaActual === 'validacion' && (
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border-t-8 border-fime-main relative">
            {qrEventoId && (
               <div className="absolute -top-4 right-0 left-0 mx-auto w-max bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                 Modo Asistencia Rápida Activado 📷
               </div>
            )}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-fime-light rounded-full mx-auto mb-4 border-2 border-fime-main flex items-center justify-center">
                <span className="text-fime-main font-bold text-2xl">FIME</span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-800">Asistfy</h2>
              <p className="text-gray-500 text-sm mt-1 font-medium">Coordinación de Mecánica y Eléctrica</p>
            </div>

            <form onSubmit={manejarValidacion} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Clave de Acceso</label>
                <input type="password" value={numEmpleado} onChange={(e) => setNumEmpleado(e.target.value)} placeholder="Ingresa tu clave" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fime-main" required disabled={cargando} />
              </div>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <p className="text-red-700 text-sm font-semibold">{error}</p>
                </div>
              )}
              <button type="submit" disabled={cargando} className="w-full bg-fime-main text-white py-3 px-4 rounded-lg font-bold hover:bg-fime-dark transition-all flex justify-center items-center">
                {cargando ? 'Consultando...' : 'Verificar Identidad'}
              </button>
            </form>
          </div>
        )}

        {pantallaActual === 'registro' && (
          <div className={`bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center border-t-8 ${themeBorder}`}>
            <div className={`w-16 h-16 ${themeLightBg} ${themeText} rounded-full mx-auto mb-4 flex items-center justify-center text-3xl`}>✓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Bienvenid{esAdmin ? 'a' : 'o'}!</h2>
            <p className="text-gray-800 font-bold mb-1">{nombreMaestro}</p> 
            
            {esAdmin ? (
              <p className="text-sky-600 text-sm font-bold mb-6 mt-2">🛡️ Modo Administrador Activado</p>
            ) : (
              <p className="text-gray-600 text-sm mb-6">Identidad confirmada en el directorio FIME.</p>
            )}

            <button onClick={() => navegarA(esAdmin ? 'admin_eventos' : 'eventos')} className={`w-full ${themeBg} text-white py-3 px-4 rounded-lg font-bold hover:${themeHover} transition-all`}>
              Entrar al Sistema
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* PANTALLA ESPECIAL: CONFIRMACIÓN FINAL POR QR                 */}
        {/* ============================================================== */}
        {pantallaActual === 'confirmar_asistencia' && (
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center border-t-8 border-green-500 transform transition-all">
            
            {!confirmacionExitosa ? (
              <>
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full mx-auto mb-5 border-4 border-white flex items-center justify-center shadow-inner text-4xl">
                  👋
                </div>
                <h2 className="text-2xl font-extrabold text-gray-800 mb-1">¡Hola de nuevo!</h2>
                <p className="text-gray-800 font-bold mb-6">{nombreMaestro}</p>
                <p className="text-gray-500 text-sm mb-8 font-medium">Estás a un paso de confirmar tu asistencia en sala para el evento.</p>
                
                <button 
                  onClick={registrarAsistenciaFinal}
                  disabled={cargando}
                  className="w-full bg-green-600 text-white py-4 px-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md flex justify-center items-center gap-2 text-lg"
                >
                  {cargando ? 'Registrando firma...' : '✅ Confirmar Asistencia'}
                </button>
                <button onClick={cerrarSesion} className="mt-4 text-gray-400 text-sm font-bold hover:text-gray-600">Cancelar y Salir</button>
              </>
            ) : (
              <div className="animate-bounce-short">
                <div className="w-20 h-20 bg-fime-light text-fime-main rounded-full mx-auto mb-5 border-4 border-white flex items-center justify-center shadow-inner text-4xl">
                  🎉
                </div>
                <h2 className="text-2xl font-extrabold text-gray-800 mb-2">¡Confirmación Exitosa!</h2>
                <p className="text-gray-600 mb-6 font-medium leading-relaxed">
                  Gracias por asistir al evento. Que lo disfrutes.
                </p>
                <p className="text-fime-main text-xs font-bold animate-pulse">Cerrando sesión de forma segura...</p>
              </div>
            )}
          </div>
        )}

      </div>
    );
  }

  // ==============================================================
  // PANTALLAS CON MENÚ LATERAL (SISTEMA INTERNO)
  // ==============================================================
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      
      {menuAbierto && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMenuAbierto(false)}></div>}

      <aside className={`fixed md:relative z-40 h-full w-64 ${themeDarkBg} text-white flex flex-col shadow-xl flex-shrink-0 transition-transform duration-300 ease-in-out ${menuAbierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-white rounded-full flex items-center justify-center ${themeTextDark} font-bold`}>A</div>
            <span className="font-bold text-lg tracking-wide">Asistfy</span>
          </div>
        </div>
        
        <div className="p-6 text-center border-b border-white/10 relative">
          {esAdmin && <div className="absolute top-4 right-4 text-xl">🛡️</div>}
          <div className={`w-20 h-20 ${themeBg} rounded-full mx-auto mb-3 border-4 border-white/20 flex items-center justify-center text-2xl font-bold`}>
            {nombreMaestro ? nombreMaestro.charAt(0) : 'U'}
          </div>
          <p className="font-semibold text-sm truncate px-2">{nombreMaestro}</p>
          <p className="text-xs text-white/60 mt-1">{esAdmin ? 'Coordinación' : `No. Emp: ${numEmpleado}`}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/40 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
          {esAdmin ? (
            <>
              <div className="pt-2 pb-1">
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider px-4">Administración</p>
              </div>
              <button onClick={() => navegarA('admin_eventos')} className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual.includes('admin_eventos') || pantallaActual === 'admin_asistencia_evento' ? `${themeBg} text-white` : 'hover:bg-white/10 text-white/80'}`}>
                <span>📅 Lista Eventos Asistencia</span>
              </button>
              <button onClick={() => navegarA('admin_maestros')} className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === 'admin_maestros' ? `${themeBg} text-white` : 'hover:bg-white/10 text-white/80'}`}>
                <span>📋 Lista Maestros Registro</span>
              </button>
              <button onClick={() => { setEditandoEventoId(null); setFormEvento({ titulo: '', descripcion: '', fecha: '', hora: '', portada: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' }); navegarA('registrar_evento'); }} className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === 'registrar_evento' ? `${themeBg} text-white` : 'hover:bg-white/10 text-white/80'}`}>
                <span>➕ Registrar Evento</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navegarA('eventos')} className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === 'eventos' || pantallaActual === 'detalle_evento' ? `${themeBg} text-white` : 'hover:bg-white/10 text-white/80'}`}>
                <span>📅 Inicio / Eventos</span>
              </button>
              <button onClick={() => navegarA('mis_eventos')} className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === 'mis_eventos' ? `${themeBg} text-white` : 'hover:bg-white/10 text-white/80'}`}>
                <span>🎟 Mis Registros</span>
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={cerrarSesion} className="w-full bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-bold transition-colors">
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col h-full bg-gray-50">
        
        <header className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 ${themeBg} rounded-full flex items-center justify-center text-white font-bold text-xs`}>A</div>
            <span className="font-bold text-gray-800">Asistfy</span>
          </div>
          <button onClick={() => setMenuAbierto(true)} className={`text-gray-600 hover:${themeText} focus:outline-none`}>
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
        </header>

        <div className="p-6 md:p-8 flex-1 flex flex-col">
          
          {pantallaActual === 'admin_eventos' && esAdmin && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Eventos Disponibles</h2>
                <button onClick={() => { setEditandoEventoId(null); setFormEvento({ titulo: '', descripcion: '', fecha: '', hora: '', portada: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' }); navegarA('registrar_evento'); }} className={`${themeBg} text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:opacity-90`}>
                  ➕ Nuevo Evento
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listaEventos.map((evento) => (
                  <div key={evento.id} className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col border border-gray-100">
                    <div className="h-40 bg-gray-200 relative overflow-hidden">
                      <img src={evento.portada} alt={evento.titulo} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{evento.titulo}</h3>
                        <p className="text-gray-500 text-xs mt-1">📅 {evento.fecha} • {evento.hora || 'Por definir'}</p>
                        <p className="text-gray-600 text-sm mt-2 line-clamp-2">{evento.descripcion}</p>
                      </div>
                      
                      {/* BOTONES DEL ADMIN EN LA TARJETA */}
                      <div className="mt-5 pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
                        <button 
                          onClick={() => abrirAsistenciasAdmin(evento)}
                          className="text-sky-600 text-sm font-bold hover:underline whitespace-nowrap"
                        >
                          {cargando && eventoSeleccionado?.id === evento.id && !mostrarModalQR ? 'Cargando...' : 'Ver Asistencias →'}
                        </button>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => abrirModalQR(evento)}
                            className="bg-black hover:bg-gray-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1"
                          >
                            📱 QR
                          </button>
                          <button 
                            onClick={() => prepararEdicionEvento(evento)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                          >
                            ✏️ Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {listaEventos.length === 0 && (
                  <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                    <p className="font-medium text-lg">No hay eventos registrados en la base de datos.</p>
                  </div>
                )}
              </div>

              {/* MODAL DEL CÓDIGO QR PARA EL ADMIN */}
              {mostrarModalQR && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setMostrarModalQR(false)}>
                  <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full" onClick={e => e.stopPropagation()}>
                    <h3 className="text-2xl font-extrabold text-gray-800 mb-2">Acceso Rápido</h3>
                    <p className="text-gray-500 text-sm mb-6">Pide a los maestros escanear este código en la puerta para confirmar asistencia.</p>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 inline-block mb-6 shadow-inner">
                      {/* Genera el código QR al vuelo con una API gratuita */}
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(linkQRDinamico)}`} 
                        alt="Código QR Asistencia" 
                        className="w-48 h-48 mx-auto"
                      />
                    </div>
                    
                    <div className="bg-sky-50 text-sky-800 text-xs p-3 rounded-lg mb-6 break-all font-mono shadow-sm">
                      {linkQRDinamico}
                    </div>

                    <button 
                      onClick={() => setMostrarModalQR(false)}
                      className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-black transition-all shadow-md"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {pantallaActual === 'admin_asistencia_evento' && esAdmin && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <button onClick={() => navegarA('admin_eventos')} className="text-gray-500 hover:text-gray-800 text-sm font-bold mb-2 flex items-center">
                    &larr; Volver a Eventos
                  </button>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{eventoSeleccionado?.titulo}</h2>
                </div>
                <span className={`${themeLightBg} ${themeText} text-xs font-bold px-3 py-1 rounded-full`}>
                  {listaDirectorio.length} Registros
                </span>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-4 text-sm font-bold text-gray-600">NO. EMPLEADO</th>
                        <th className="p-4 text-sm font-bold text-gray-600">NOMBRE DEL DOCENTE</th>
                        <th className="p-4 text-sm font-bold text-gray-600 text-center">PRE-ASISTENCIA</th>
                        <th className="p-4 text-sm font-bold text-gray-600 text-center">FIRMA (ASISTENCIA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {listaDirectorio.map((maestro) => (
                        <tr key={maestro.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-sm font-semibold text-gray-700">{maestro.id}</td>
                          <td className="p-4 text-sm text-gray-800 font-medium">{maestro.nombreCompleto}</td>
                          <td className="p-4 text-center text-xl">
                            {preRegistradosEvento.includes(maestro.id) ? '✅' : '❗'}
                          </td>
                          <td className="p-4 text-center text-xl">
                            {/* AQUÍ SE VERIFICA SI YA FIRMÓ POR EL QR */}
                            {asistentesFinalesEvento.includes(maestro.id) ? '✅' : '❗'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ... (LAS DEMÁS PANTALLAS DE ADMIN COMO MAESTROS Y REGISTRAR EVENTO SE MANTIENEN IGUAL) ... */}
          {pantallaActual === 'admin_maestros' && esAdmin && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Base de Datos General</h2>
                
                {modoEdicion ? (
                  <div className="flex space-x-2">
                    <button onClick={cancelarEdicion} disabled={cargando} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300">
                      Cancelar
                    </button>
                    <button onClick={guardarCambios} disabled={cargando} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center">
                      {cargando ? 'Guardando...' : '💾 Guardar Todo'}
                    </button>
                  </div>
                ) : (
                  <button onClick={iniciarEdicion} className={`${themeBg} text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:opacity-90`}>
                    ✏️ Editar Tabla
                  </button>
                )}
              </div>
              
              <div className={`bg-white rounded-xl shadow-sm border flex-1 flex flex-col ${modoEdicion ? 'border-sky-300 ring-2 ring-sky-100' : 'border-gray-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-4 text-sm font-bold text-gray-600 w-1/4">TRAYECTORIA</th>
                        <th className="p-4 text-sm font-bold text-gray-600 w-1/4">NO. EMPLEADO</th>
                        <th className="p-4 text-sm font-bold text-gray-600 w-2/4">NOMBRE DEL DOCENTE</th>
                        {modoEdicion && <th className="p-4 text-sm font-bold text-red-500 text-center">ELIMINAR</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {!modoEdicion && listaDirectorio.map((maestro) => (
                        <tr key={maestro.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-sm text-gray-500">{maestro.trayectoria || '-'}</td>
                          <td className="p-4 text-sm font-semibold text-gray-700">{maestro.id}</td>
                          <td className="p-4 text-sm text-gray-800 font-medium">{maestro.nombreCompleto}</td>
                        </tr>
                      ))}
                      {modoEdicion && cambiosDirectorio.map((maestro, index) => (
                        <tr key={index} className="bg-sky-50/30">
                          <td className="p-2"><input type="text" value={maestro.trayectoria} onChange={(e) => handleCambioInput(index, 'trayectoria', e.target.value)} className="w-full p-2 border border-sky-200 rounded outline-none focus:border-sky-400 text-sm" placeholder="Ej. 10 años"/></td>
                          <td className="p-2"><input type="text" value={maestro.id} onChange={(e) => handleCambioInput(index, 'id', e.target.value)} className="w-full p-2 border border-sky-200 rounded outline-none focus:border-sky-400 text-sm font-semibold" placeholder="No. Empleado"/></td>
                          <td className="p-2"><input type="text" value={maestro.nombreCompleto} onChange={(e) => handleCambioInput(index, 'nombreCompleto', e.target.value)} className="w-full p-2 border border-sky-200 rounded outline-none focus:border-sky-400 text-sm" placeholder="Nombre completo"/></td>
                          <td className="p-2 text-center"><button onClick={() => eliminarFila(index)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg">🗑️</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {modoEdicion && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                    <button onClick={agregarFila} className="text-sky-600 font-bold text-sm bg-sky-100 hover:bg-sky-200 px-4 py-2 rounded-lg transition-colors">➕ Agregar Maestro</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {pantallaActual === 'registrar_evento' && esAdmin && (
            <div className="max-w-2xl mx-auto w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{editandoEventoId ? 'Editar Evento' : 'Crear Nuevo Evento'}</h2>
                <button onClick={() => navegarA('admin_eventos')} className="text-gray-500 hover:text-gray-800 text-sm font-bold">&larr; Cancelar</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                <form onSubmit={guardarEvento} className="space-y-5">
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Título del Evento</label><input type="text" value={formEvento.titulo} onChange={(e) => setFormEvento({...formEvento, titulo: e.target.value})} placeholder="Ej. Junta de Academia" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm" required /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label><input type="date" value={formEvento.fecha} onChange={(e) => setFormEvento({...formEvento, fecha: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm" required /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Hora</label><input type="time" value={formEvento.hora} onChange={(e) => setFormEvento({...formEvento, hora: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm" /></div>
                  </div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Descripción corta</label><textarea rows="3" value={formEvento.descripcion} onChange={(e) => setFormEvento({...formEvento, descripcion: e.target.value})} placeholder="Detalles breves del evento..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"></textarea></div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Selecciona una Portada Predefinida</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {[{ label: 'Académico', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' },{ label: 'Conferencia', url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80' },{ label: 'Tecnología', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80' },{ label: 'Reunión', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80' }].map((item, idx) => (
                        <div key={idx} onClick={() => setFormEvento({...formEvento, portada: item.url})} className={`cursor-pointer border-2 rounded-lg p-2 text-center text-xs font-bold transition-all ${formEvento.portada === item.url ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-600'}`}>{item.label}</div>
                      ))}
                    </div>
                    <input type="text" value={formEvento.portada} onChange={(e) => setFormEvento({...formEvento, portada: e.target.value})} placeholder="O pega el link de una imagen..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-xs text-gray-500"/>
                  </div>
                  <div className="flex gap-3 pt-2">
                    {editandoEventoId && (<button type="button" onClick={eliminarEvento} disabled={cargando} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 px-4 rounded-lg font-bold transition-all text-sm flex items-center justify-center">🗑️ Eliminar</button>)}
                    <button type="submit" disabled={cargando} className={`flex-1 ${themeBg} text-white py-3 px-4 rounded-lg font-bold hover:opacity-90 transition-all text-sm`}>{cargando ? 'Guardando en la nube...' : (editandoEventoId ? '💾 Actualizar Evento' : '🚀 Publicar Evento')}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VISTAS DE USUARIO NORMAL (SIN QR ACTIVO) */}
          {!esAdmin && pantallaActual === 'eventos' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Próximos Eventos</h2>
                <p className="text-gray-500 text-sm mt-1">Selecciona un evento para registrar tu pre-asistencia o ver los detalles.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listaEventos.map((evento) => (
                  <div key={evento.id} className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col border border-gray-100 transition-transform hover:-translate-y-1">
                    <div className="h-40 bg-gray-200 relative overflow-hidden"><img src={evento.portada} alt={evento.titulo} className="w-full h-full object-cover" /></div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{evento.titulo}</h3>
                        <p className="text-gray-500 text-xs mt-1">📅 {evento.fecha} • {evento.hora || 'Por definir'}</p>
                        <p className="text-gray-600 text-sm mt-2 line-clamp-2">{evento.descripcion}</p>
                      </div>
                      <div className="mt-5 pt-3 border-t border-gray-100">
                        <button onClick={() => abrirDetalleEventoUsuario(evento)} className="w-full bg-fime-main text-white py-2.5 rounded-lg font-bold hover:bg-fime-dark transition-all text-sm flex justify-center items-center gap-2">
                          {cargando && eventoSeleccionado?.id === evento.id ? 'Cargando...' : '👁️ Ver Detalles'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!esAdmin && pantallaActual === 'detalle_evento' && eventoSeleccionado && (
            <div className="max-w-3xl mx-auto w-full relative">
              <button onClick={() => navegarA('eventos')} className="text-gray-500 hover:text-gray-800 text-sm font-bold mb-4 flex items-center transition-colors">&larr; Regresar a Eventos</button>
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="h-64 bg-gray-200 relative overflow-hidden"><img src={eventoSeleccionado.portada} alt={eventoSeleccionado.titulo} className="w-full h-full object-cover" /></div>
                <div className="p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{eventoSeleccionado.titulo}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6 font-medium">
                    <span className="flex items-center bg-gray-50 px-3 py-1 rounded-full border border-gray-100">📅 {eventoSeleccionado.fecha}</span>
                    <span className="flex items-center bg-gray-50 px-3 py-1 rounded-full border border-gray-100">⏰ {eventoSeleccionado.hora || 'Por definir'}</span>
                  </div>
                  <div className="text-gray-600 mb-8 whitespace-pre-wrap leading-relaxed">{eventoSeleccionado.descripcion || 'Sin descripción detallada.'}</div>
                  <div className="flex flex-col sm:flex-row gap-4 border-t border-gray-100 pt-6">
                    <button onClick={() => navegarA('eventos')} className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-bold hover:bg-gray-200 transition-all flex justify-center items-center">Regresar</button>
                    <button onClick={registrarPreAsistencia} disabled={cargando || yaRegistrado} className={`flex-1 text-white py-3 px-4 rounded-lg font-bold transition-all flex justify-center items-center gap-2 ${yaRegistrado ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'}`}>
                      {cargando ? 'Procesando...' : (yaRegistrado ? '✅ Ya estás registrado' : '✅ Pre-asistencia')}
                    </button>
                  </div>
                </div>
              </div>
              {mostrarPopup && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all animate-bounce-short">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner border-4 border-white"><span className="text-4xl">🎉</span></div>
                    <h3 className="text-2xl font-extrabold text-gray-800 mb-2">¡Pre-asistencia enviada!</h3>
                    <p className="text-gray-600 mb-6 font-medium leading-relaxed">Tu registro para <strong className="text-gray-800">{eventoSeleccionado.titulo}</strong> ha sido confirmado exitosamente.</p>
                    <button onClick={() => setMostrarPopup(false)} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md hover:shadow-lg">Entendido</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!esAdmin && pantallaActual === 'mis_eventos' && (
             <div>
               <h2 className="text-2xl font-bold text-gray-800">Mis Registros</h2>
               <p className="text-gray-500 mt-2">Aquí verás tu historial de asistencias (Próximamente).</p>
             </div>
          )}

        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);