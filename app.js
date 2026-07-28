const { useState, useEffect } = React;

function App() {
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

  const [formEvento, setFormEvento] = useState({ titulo: '', descripcion: '', fecha: '', hora: '', portada: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' });
  const [editandoEventoId, setEditandoEventoId] = useState(null);

  useEffect(() => {
    localStorage.setItem('pantallaFime', pantallaActual);
    localStorage.setItem('esAdminFime', esAdmin);
  }, [pantallaActual, esAdmin]);

  useEffect(() => {
    if (esAdmin) {
      if (pantallaActual === 'admin_maestros' || pantallaActual === 'admin_asistencia_evento') {
        obtenerMaestros();
      }
      if (pantallaActual === 'admin_eventos') {
        obtenerEventos();
      }
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

    if (inputLimpio === '$#024*816*$') {
      setNombreMaestro('Dra. Indira Escamilla');
      setEsAdmin(true);
      setPantallaActual('registro');
      setCargando(false);
      return;
    }

    try {
      const docRef = db.collection('directorio_fime').doc(inputLimpio);
      const docSnap = await docRef.get(); 

      if (docSnap.exists) {
        const datos = docSnap.data();
        setNombreMaestro(datos.nombreCompleto);
        setEsAdmin(false); 
        setPantallaActual('registro');
      } else {
        setError('Número de empleado no reconocido en la facultad.');
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
  };

  const navegarA = (pantalla) => {
    setPantallaActual(pantalla);
    setMenuAbierto(false);
    setModoEdicion(false); 
    setEditandoEventoId(null);
  };

  const iniciarEdicion = () => {
    setCambiosDirectorio(JSON.parse(JSON.stringify(listaDirectorio)));
    setModoEdicion(true);
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setCambiosDirectorio([]);
  };

  const handleCambioInput = (index, campo, valor) => {
    const nuevaLista = [...cambiosDirectorio];
    nuevaLista[index][campo] = valor;
    setCambiosDirectorio(nuevaLista);
  };

  const agregarFila = () => {
    setCambiosDirectorio([...cambiosDirectorio, { id: '', nombreCompleto: '', trayectoria: '', registrado: false }]);
  };

  const eliminarFila = (index) => {
    const nuevaLista = [...cambiosDirectorio];
    nuevaLista.splice(index, 1);
    setCambiosDirectorio(nuevaLista);
  };

  const guardarCambios = async () => {
    setCargando(true);
    try {
      const batch = db.batch();
      
      const eliminados = listaDirectorio.filter(orig => !cambiosDirectorio.some(c => c.id === orig.id));
      eliminados.forEach(emp => {
         batch.delete(db.collection('directorio_fime').doc(emp.id));
      });

      cambiosDirectorio.forEach(emp => {
         if(emp.id && emp.id.trim() !== '') {
           const docRef = db.collection('directorio_fime').doc(emp.id.trim());
           batch.set(docRef, {
             nombreCompleto: emp.nombreCompleto,
             trayectoria: emp.trayectoria || '',
             registrado: emp.registrado || false
           }, { merge: true });
         }
      });

      await batch.commit(); 
      setListaDirectorio(cambiosDirectorio);
      setModoEdicion(false);
      alert("✅ Cambios guardados con éxito en la base de datos.");
    } catch (err) {
      alert("❌ Error al guardar: " + err.message);
    }
    setCargando(false);
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    if (!formEvento.titulo || !formEvento.fecha) {
      alert("Por favor completa al menos el título y la fecha.");
      return;
    }

    setCargando(true);
    try {
      if (editandoEventoId) {
        await db.collection('eventos_fime').doc(editandoEventoId).update({
          titulo: formEvento.titulo,
          descripcion: formEvento.descripcion,
          fecha: formEvento.fecha,
          hora: formEvento.hora,
          portada: formEvento.portada
        });
        alert("✅ ¡Evento actualizado con éxito!");
      } else {
        await db.collection('eventos_fime').add({
          titulo: formEvento.titulo,
          descripcion: formEvento.descripcion,
          fecha: formEvento.fecha,
          hora: formEvento.hora,
          portada: formEvento.portada,
          creado: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("✅ ¡Evento creado con éxito!");
      }

      setFormEvento({ titulo: '', descripcion: '', fecha: '', hora: '', portada: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' });
      setEditandoEventoId(null);
      navegarA('admin_eventos');
    } catch (err) {
      alert("❌ Error al guardar evento: " + err.message);
    }
    setCargando(false);
  };

  // NUEVA FUNCIÓN PARA ELIMINAR EVENTO CON LA ADVERTENCIA SOLICITADA
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
      } catch (err) {
        alert("❌ Error al eliminar el evento: " + err.message);
      }
      setCargando(false);
    }
  };

  const prepararEdicionEvento = (evento) => {
    setFormEvento({
      titulo: evento.titulo || '',
      descripcion: evento.descripcion || '',
      fecha: evento.fecha || '',
      hora: evento.hora || '',
      portada: evento.portada || ''
    });
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

  if (pantallaActual === 'validacion' || pantallaActual === 'registro') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {pantallaActual === 'validacion' && (
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border-t-8 border-fime-main">
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
                <input
                  type="password"
                  value={numEmpleado}
                  onChange={(e) => setNumEmpleado(e.target.value)}
                  placeholder="Ingresa tu clave"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fime-main"
                  required
                  disabled={cargando}
                />
              </div>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <p className="text-red-700 text-sm font-semibold">{error}</p>
                </div>
              )}
              <button 
                type="submit" 
                disabled={cargando}
                className="w-full bg-fime-main text-white py-3 px-4 rounded-lg font-bold hover:bg-fime-dark transition-all flex justify-center items-center"
              >
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

            <button
              onClick={() => navegarA(esAdmin ? 'admin_eventos' : 'eventos')}
              className={`w-full ${themeBg} text-white py-3 px-4 rounded-lg font-bold ${themeHover} transition-all`}
            >
              Entrar al Sistema
            </button>
          </div>
        )}
      </div>
    );
  }

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
              <button onClick={() => navegarA('eventos')} className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === 'eventos' ? `${themeBg} text-white` : 'hover:bg-white/10 text-white/80'}`}>
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
                <button onClick={() => { setEditandoEventoId(null); setFormEvento({ titulo: '', descripcion: '', fecha: '', hora: '', portada: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' }); navegarA('registrar_evento'); }} className={`${themeBg} text-white px-4 py-2 rounded-lg text-sm font-bold ${themeHover} shadow-sm`}>
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
                      
                      <div className="mt-5 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <button 
                          onClick={() => { setEventoSeleccionado(evento); navegarA('admin_asistencia_evento'); }}
                          className="text-sky-600 text-sm font-bold hover:underline"
                        >
                          Ver Asistencias &rarr;
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
                ))}

                {listaEventos.length === 0 && (
                  <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                    <p className="font-medium text-lg">No hay eventos registrados en la base de datos.</p>
                    <p className="text-sm mt-1 text-gray-400">Crea el primero usando el botón de arriba.</p>
                  </div>
                )}
              </div>
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
                        <th className="p-4 text-sm font-bold text-gray-600 text-center">FIRMA (ASISTENCIA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {listaDirectorio.map((maestro) => (
                        <tr key={maestro.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-sm font-semibold text-gray-700">{maestro.id}</td>
                          <td className="p-4 text-sm text-gray-800 font-medium">{maestro.nombreCompleto}</td>
                          <td className="p-4 text-center text-xl">❗</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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
                  <button onClick={iniciarEdicion} className={`${themeBg} text-white px-4 py-2 rounded-lg text-sm font-bold ${themeHover} shadow-sm`}>
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
                          <td className="p-2">
                            <input type="text" value={maestro.trayectoria} onChange={(e) => handleCambioInput(index, 'trayectoria', e.target.value)} className="w-full p-2 border border-sky-200 rounded outline-none focus:border-sky-400 text-sm" placeholder="Ej. 10 años"/>
                          </td>
                          <td className="p-2">
                            <input type="text" value={maestro.id} onChange={(e) => handleCambioInput(index, 'id', e.target.value)} className="w-full p-2 border border-sky-200 rounded outline-none focus:border-sky-400 text-sm font-semibold" placeholder="No. Empleado"/>
                          </td>
                          <td className="p-2">
                            <input type="text" value={maestro.nombreCompleto} onChange={(e) => handleCambioInput(index, 'nombreCompleto', e.target.value)} className="w-full p-2 border border-sky-200 rounded outline-none focus:border-sky-400 text-sm" placeholder="Nombre completo"/>
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={() => eliminarFila(index)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg">
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>

                {modoEdicion && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                    <button onClick={agregarFila} className="text-sky-600 font-bold text-sm bg-sky-100 hover:bg-sky-200 px-4 py-2 rounded-lg transition-colors">
                      ➕ Agregar Maestro
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ADMIN: 4. FORMULARIO CREAR / EDITAR / ELIMINAR EVENTO */}
          {/* ============================================================== */}
          {pantallaActual === 'registrar_evento' && esAdmin && (
            <div className="max-w-2xl mx-auto w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                  {editandoEventoId ? 'Editar Evento' : 'Crear Nuevo Evento'}
                </h2>
                <button onClick={() => navegarA('admin_eventos')} className="text-gray-500 hover:text-gray-800 text-sm font-bold">
                  &larr; Cancelar
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                <form onSubmit={guardarEvento} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Título del Evento</label>
                    <input 
                      type="text" 
                      value={formEvento.titulo}
                      onChange={(e) => setFormEvento({...formEvento, titulo: e.target.value})}
                      placeholder="Ej. Junta de Academia"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label>
                      <input 
                        type="date" 
                        value={formEvento.fecha}
                        onChange={(e) => setFormEvento({...formEvento, fecha: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Hora</label>
                      <input 
                        type="time" 
                        value={formEvento.hora}
                        onChange={(e) => setFormEvento({...formEvento, hora: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Descripción corta</label>
                    <textarea 
                      rows="3"
                      value={formEvento.descripcion}
                      onChange={(e) => setFormEvento({...formEvento, descripcion: e.target.value})}
                      placeholder="Detalles breves del evento..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Selecciona una Portada Predefinida (o pega un link)</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {[
                        { label: 'Académico', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' },
                        { label: 'Conferencia', url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80' },
                        { label: 'Tecnología', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80' },
                        { label: 'Reunión', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80' }
                      ].map((item, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setFormEvento({...formEvento, portada: item.url})}
                          className={`cursor-pointer border-2 rounded-lg p-2 text-center text-xs font-bold transition-all ${formEvento.portada === item.url ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-600'}`}
                        >
                          {item.label}
                        </div>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      value={formEvento.portada}
                      onChange={(e) => setFormEvento({...formEvento, portada: e.target.value})}
                      placeholder="O pega el link de una imagen..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-xs text-gray-500"
                    />
                  </div>

                  {/* BOTONES DE ACCIÓN (GUARDAR Y ELIMINAR SI ESTÁ EDITANDO) */}
                  <div className="flex gap-3 pt-2">
                    {editandoEventoId && (
                      <button 
                        type="button" 
                        onClick={eliminarEvento}
                        disabled={cargando}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 px-4 rounded-lg font-bold transition-all text-sm flex items-center justify-center"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                    <button 
                      type="submit" 
                      disabled={cargando}
                      className={`flex-1 ${themeBg} text-white py-3 px-4 rounded-lg font-bold ${themeHover} transition-all text-sm`}
                    >
                      {cargando ? 'Guardando en la nube...' : (editandoEventoId ? '💾 Actualizar Evento' : '🚀 Publicar Evento')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {!esAdmin && pantallaActual === 'eventos' && (
             <div><h2 className="text-2xl font-bold">Vista de Eventos (Maestro Normal)</h2></div>
          )}
          {!esAdmin && pantallaActual === 'mis_eventos' && (
             <div><h2 className="text-2xl font-bold">Vista de Mis Registros</h2></div>
          )}

        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);