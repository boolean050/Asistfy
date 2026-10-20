const { useState, useEffect } = React;

// Cuenta del administrador en Firebase Authentication
const CORREO_ADMIN = "coordinacion.fimeed05@gmail.com";

// === COMPONENTE DINÁMICO DE ASISTENCIA PARA DOCENTES ===
const BannerAsistenciaDinamico = ({ evento, numEmpleado }) => {
  const [asistioHoy, setAsistioHoy] = useState(false);
  const [horaRegistro, setHoraRegistro] = useState("");
  // NUEVO: Estado para ocultar el parpadeo mientras lee Firebase
  const [cargandoBanner, setCargandoBanner] = useState(true);

  useEffect(() => {
    if (!evento || !numEmpleado) return;

    const calcularDiasEvento = (fechaInicio, fechaFin, esMultiDia) => {
      if (!esMultiDia || !fechaFin || !fechaInicio) return 1;
      const inicio = new Date(`${fechaInicio}T00:00:00`);
      const fin = new Date(`${fechaFin}T00:00:00`);
      const diferenciaMs = fin - inicio;
      const dias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24)) + 1;

      // BLINDAJE ANTI-NaN: Si el cálculo da error, devolvemos 1 día por defecto
      return dias > 0 && !isNaN(dias) ? dias : 1;
    };

    const docIdUnico = `${evento.id}_${String(numEmpleado).trim()}`;

    const unsubscribe = db
      .collection("asistencias")
      .doc(docIdUnico)
      .onSnapshot((docSnap) => {
        if (docSnap.exists) {
          const data = docSnap.data();
          const fechaHoyLocal = new Date().toLocaleDateString("en-CA");
          const diaDeHoyNumero = Number(
            calcularDiasEvento(evento.fecha, fechaHoyLocal, evento.esMultiDia),
          );

          const diasAsistidos = data.diasAsistidos
            ? data.diasAsistidos.map(Number)
            : [];

          if (diasAsistidos.includes(diaDeHoyNumero)) {
            setAsistioHoy(true);
            const timestampFirma = data.ultimaFirma || data.fechaFirma;
            if (timestampFirma) {
              setHoraRegistro(
                new Date(timestampFirma.toDate()).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              );
            }
          } else {
            setAsistioHoy(false);
          }
        } else {
          setAsistioHoy(false);
        }

        // Apagamos la animación de carga en cuanto Firebase responde
        setCargandoBanner(false);
      });

    return () => unsubscribe();
  }, [evento, numEmpleado]);

  const fechaVisual = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // 1. ESTADO DE CARGA (Evita el parpadeo)
  if (cargandoBanner) {
    return (
      <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 text-center flex flex-col justify-center shadow-inner transition-all duration-300 animate-pulse">
        <span className="font-semibold text-gray-400 text-sm mb-1">
          Verificando registro del día...
        </span>
        <span className="font-black tracking-wide text-gray-300 drop-shadow-sm text-[0.90rem] sm:text-base">
          CARGANDO
        </span>
      </div>
    );
  }

  // 2. ESTADO VERDE (Ya asistió)
  if (asistioHoy) {
    return (
      <div className="w-full bg-green-50 p-4 rounded-xl border border-green-200 text-center flex flex-col justify-center shadow-inner transition-all duration-300">
        <span className="font-semibold text-green-800 text-sm mb-1">
          Ya estás registrado en el día <strong>{fechaVisual}</strong>
          {horaRegistro ? ` a las ${horaRegistro}` : ""}.
        </span>
        <span className="font-black tracking-wide text-green-700 drop-shadow-sm text-[0.90rem] sm:text-base">
          ¡TE ESPERAMOS EN EL EVENTO!
        </span>
      </div>
    );
  }

  // 3. ESTADO NARANJA (Falta asistir)
  return (
    <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200 text-center flex flex-col justify-center shadow-inner transition-all duration-300">
      <span className="font-semibold text-gray-700 text-sm mb-1">
        No has confirmado asistencia para el día <strong>{fechaVisual}</strong>.
      </span>
      <span className="font-black tracking-wide text-orange-600 drop-shadow-sm text-[0.90rem] sm:text-base">
        FAVOR DE CONFIRMAR ASISTENCIA MEDIANTE EL QR ENVIADO
      </span>
    </div>
  );
};

function App() {
  // === 1. DETECCIÓN DEL LINK DEL QR ===
  const urlParams = new URLSearchParams(window.location.search);
  const urlEventoId = urlParams.get("asistencia");
  const [qrEventoId, setQrEventoId] = useState(urlEventoId);

  const [pantallaActual, setPantallaActual] = useState(() => {
    return sessionStorage.getItem("pantallaFime") || "validacion";
  });

  const [mostrarPopupErrorFecha, setMostrarPopupErrorFecha] = useState(false);

  const [numEmpleado, setNumEmpleado] = useState(
    () => sessionStorage.getItem("numEmpleadoFime") || "",
  );
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");

  const [cargando, setCargando] = useState(false);
  const [nombreMaestro, setNombreMaestro] = useState(
    () => sessionStorage.getItem("nombreMaestroFime") || "",
  );
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [colorTema, setColorTema] = useState(
    () => sessionStorage.getItem("colorTemaFime") || "bg-fime-main",
  );
  const [mostrarMenuColor, setMostrarMenuColor] = useState(false);
  const coloresAdmin = ["bg-sky-400", "bg-[#c8b28a]", "bg-violet-400"];
  const coloresDocente = [
    "bg-pink-500",
    "bg-orange-400",
    "bg-yellow-500",
    "bg-blue-800",
    "bg-fime-main",
  ];
  //AQUI SE HIZO EL PRIMER ERROR

  const [esAdmin, setEsAdmin] = useState(() => {
    return sessionStorage.getItem("esAdminFime") === "true";
  });
  const coloresDisponibles = esAdmin ? coloresAdmin : coloresDocente;

  const [listaDirectorio, setListaDirectorio] = useState([]);
  const [filaNuevaIndex, setFilaNuevaIndex] = useState(null);
  const [colorAdminGlobal, setColorAdminGlobal] = useState("bg-fime-main");
  const [listaEventos, setListaEventos] = useState([]);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [cambiosDirectorio, setCambiosDirectorio] = useState([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);

  const [mostrarPopup, setMostrarPopup] = useState(false);

  // ESTADOS DE ASISTENCIAS
  const [preRegistradosEvento, setPreRegistradosEvento] = useState([]);
  const [asistentesFinalesEvento, setAsistentesFinalesEvento] = useState([]);
  const [yaRegistrado, setYaRegistrado] = useState(false);
  const [misInvitaciones, setMisInvitaciones] = useState([]); // Para visualizacion de tarjetas de evento de usuarios permitidos

  // ESTADOS DEL QR Y CONFIRMACIÓN FINAL
  const [mostrarModalQR, setMostrarModalQR] = useState(false);
  const [linkQRDinamico, setLinkQRDinamico] = useState("");
  const [confirmacionExitosa, setConfirmacionExitosa] = useState(false);
  const [modalYaRegistrado, setModalYaRegistrado] = useState({
    visible: false,
    dia: "",
    fecha: "",
    hora: "",
  });

  const [formEvento, setFormEvento] = useState({
    titulo: "",
    descripcion: "",
    fecha: "",
    fechaFin: "", // NUEVO
    hora: "",
    horaFin: "", // NUEVO
    portada:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
    tipo: "publico",
    esMultiDia: false, // NUEVO: Controla el switch de varios días
  });
  const [editandoEventoId, setEditandoEventoId] = useState(null);

  // NUEVO: ESTADOS PARA BUSCADORES Y DESCARGAS
  const [listaEventosInternos, setListaEventosInternos] = useState([]);
  const [busquedaMaestros, setBusquedaMaestros] = useState("");
  const [busquedaAsistencias, setBusquedaAsistencias] = useState("");
  const [menuDescargaAbierto, setMenuDescargaAbierto] = useState(false);

  // === NUEVOS ESTADOS PARA SELECCIÓN ===
  const [modoSeleccionDescarga, setModoSeleccionDescarga] = useState(false);
  const [maestrosSeleccionados, setMaestrosSeleccionados] = useState([]);
  const [menuDescargaGeneralAbierto, setMenuDescargaGeneralAbierto] =
    useState(false);

  // === NUEVOS ESTADOS PARA AGREGAR MAESTRO MANUAL ===
  const [mostrarModalAgregarMaestro, setMostrarModalAgregarMaestro] =
    useState(false);
  const [formNuevoMaestro, setFormNuevoMaestro] = useState({
    id: "",
    nombreCompleto: "",
  });
  const [resaltarFechas, setResaltarFechas] = useState(false); // Para el efecto visual al clonar

  // === CÁLCULO DE DÍAS PARA EVENTOS MULTI-DÍA ===
  const calcularDiasEvento = (fechaInicio, fechaFin, esMultiDia) => {
    if (!esMultiDia || !fechaFin || !fechaInicio) return 1;
    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T00:00:00`);
    const diferenciaMs = fin - inicio;
    const dias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24)) + 1;

    // BLINDAJE ANTI-NaN: Si el cálculo da error, devolvemos 1 día por defecto
    return dias > 0 && !isNaN(dias) ? dias : 1;
  };

  // === NUEVO: CEREBRO DEL TIEMPO (CADUCIDAD Y AUTODESTRUCCIÓN) ===
  const esEventoCaducado = (evento) => {
    if (!evento || !evento.fecha) return false;
    const fechaRef =
      evento.esMultiDia && evento.fechaFin ? evento.fechaFin : evento.fecha;
    // CORRECCIÓN: Ya NO toma evento.hora. Si no hay hora fin, se va hasta las 23:59.
    const horaRef = evento.horaFin || "23:59";
    const limite = new Date(`${fechaRef}T${horaRef}:00`);
    return new Date() > limite;
  };

  const diasParaEliminacion = (evento) => {
    if (!evento || !evento.fecha) return 7;
    const fechaRef =
      evento.esMultiDia && evento.fechaFin ? evento.fechaFin : evento.fecha;
    // CORRECCIÓN: Ya NO toma evento.hora. Si no hay hora fin, se va hasta las 23:59.
    const horaRef = evento.horaFin || "23:59";
    const limite = new Date(`${fechaRef}T${horaRef}:00`);
    const diferenciaMs = new Date() - limite;
    const diasPasados = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    return Math.max(7 - diasPasados, 0);
  };

  // === NUEVO: TRADUCTOR DE FECHAS (EJ. 2026-Ago-22) ===
  const obtenerFechaFormateada = (fechaInicio, diaIndex) => {
    if (!fechaInicio) return `DÍA ${diaIndex + 1}`;
    const [year, month, day] = fechaInicio.split("-");
    const fecha = new Date(year, month - 1, day);
    fecha.setDate(fecha.getDate() + diaIndex);
    const meses = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    return `${fecha.getFullYear()}-${meses[fecha.getMonth()]}-${String(fecha.getDate()).padStart(2, "0")}`;
  };

  // === NUEVO: DETECTOR DE EVENTOS FUTUROS ===
  const esEventoFuturo = (fechaEvento) => {
    if (!fechaEvento) return false;
    const fechaHoyLocal = new Date().toLocaleDateString("en-CA"); // Calcula el hoy exacto (YYYY-MM-DD)
    return fechaEvento > fechaHoyLocal;
  };

  // === NUEVO: MODO DIOS (ALTERAR ASISTENCIAS CON 1 CLIC) BLINDADO ===
  const toggleAsistenciaManual = async (maestro, diaColumna) => {
    if (!eventoSeleccionado) return;

    const idLimpio = String(maestro.id).trim();
    const docIdUnico = `${eventoSeleccionado.id}_${idLimpio}`;
    const docRef = db.collection("asistencias").doc(docIdUnico);

    try {
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        // 1. Extraemos el arreglo de la BD y forzamos que TODO sea número
        const dataActual = docSnap.data();
        let diasActuales = dataActual.diasAsistidos
          ? dataActual.diasAsistidos.map(Number)
          : [];
        const diaBuscado = Number(diaColumna);

        // 2. Lógica matemática a prueba de fallos
        if (diasActuales.includes(diaBuscado)) {
          diasActuales = diasActuales.filter((d) => d !== diaBuscado); // Quitamos la palomita
        } else {
          diasActuales.push(diaBuscado); // Ponemos la palomita
        }

        // 3. Sobrescribimos el arreglo completo en la nube
        await docRef.update({
          diasAsistidos: diasActuales,
          ultimaModificacionAdmin:
            firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Si no existe el documento, lo creamos
        await docRef.set({
          eventoId: eventoSeleccionado.id,
          numEmpleado: idLimpio,
          nombreMaestro: maestro.nombreCompleto || "Desconocido",
          diasAsistidos: [Number(diaColumna)],
          fechaFirma: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error al modificar asistencia:", error);
      alert("❌ Error de conexión al intentar cambiar la asistencia.");
    }
  };

  // 1. FUNCIÓN PARA AGREGAR MAESTRO MANUAL (Reemplazo del botón morado)
  const agregarMaestroManualEvento = async (e) => {
    e.preventDefault();
    // AÑADIDO: Blindaje extra para asegurar que todo exista
    if (
      !eventoSeleccionado ||
      !eventoSeleccionado.id ||
      !formNuevoMaestro.id ||
      !formNuevoMaestro.nombreCompleto
    ) {
      alert("Error: Faltan datos o el evento no está seleccionado.");
      return;
    }
    setCargando(true);

    try {
      const idLimpio = String(formNuevoMaestro.id).trim();
      const nombreLimpio = formNuevoMaestro.nombreCompleto.trim();

      const dirRef = db.collection("directorio_fime").doc(idLimpio);
      await dirRef.set(
        { nombreCompleto: nombreLimpio, registrado: true },
        { merge: true },
      );

      const docIdUnico = `${eventoSeleccionado.id}_${idLimpio}`;
      const preAsisRef = db.collection("pre_asistencias").doc(docIdUnico);
      await preAsisRef.set({
        eventoId: eventoSeleccionado.id,
        numEmpleado: idLimpio,
        nombreMaestro: nombreLimpio,
        fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
      });

      setPreRegistradosEvento((prev) => [
        ...new Set([...(prev || []), idLimpio]),
      ]);
      setMostrarModalAgregarMaestro(false);
      setFormNuevoMaestro({ id: "", nombreCompleto: "" });
      alert("✅ Maestro agregado correctamente a la lista.");
    } catch (error) {
      console.error(error);
      alert("❌ Error al agregar maestro.");
    }
    setCargando(false);
  };

  const prepararReutilizacionEvento = async (eventoViejo) => {
    setCargando(true);
    try {
      // CORRECCIÓN: Eliminado el 'db.collection(...).doc(...).delete()'
      // Solo preparamos los datos clonados en el formulario, añadiendo "(Copia)" al nombre
      setFormEvento({
        titulo: eventoViejo.titulo ? `${eventoViejo.titulo} (Copia)` : "",
        descripcion: eventoViejo.descripcion || "",
        fecha: "",
        fechaFin: "",
        hora: eventoViejo.hora || "",
        horaFin: eventoViejo.horaFin || "",
        portada: eventoViejo.portada || "",
        esMultiDia: eventoViejo.esMultiDia || false,
        tipo: eventoViejo.tipo || "publico",
      });

      setEditandoEventoId(null); // NULL asegura que Firebase asigne un ID completamente nuevo

      setResaltarFechas(true);
      setTimeout(() => setResaltarFechas(false), 5000);
      setPantallaActual("registrar_evento");
    } catch (error) {
      console.error("Error al clonar el evento:", error);
      alert("⚠️ Hubo un error de conexión al intentar clonar el evento.");
    } finally {
      setCargando(false);
    }
  };

  // === EFECTOS DE GUARDADO Y CARGA INICIAL ===
  useEffect(() => {
    sessionStorage.setItem("pantallaFime", pantallaActual);
    sessionStorage.setItem("esAdminFime", esAdmin);
    sessionStorage.setItem("numEmpleadoFime", numEmpleado);
    sessionStorage.setItem("nombreMaestroFime", nombreMaestro);
    sessionStorage.setItem("colorTemaFime", colorTema);
  }, [pantallaActual, esAdmin, numEmpleado, nombreMaestro, colorTema]);

  // === CORRECCIÓN VITAL: CACHÉ DE SESIÓN PARA AHORRAR LECTURAS ===
  useEffect(() => {
    // Solo vamos a Firebase si no tenemos los datos en la memoria RAM (estado)
    if (listaEventos.length === 0) obtenerEventos("publico");
    if (listaEventosInternos.length === 0) obtenerEventos("interno");
      }, [esAdmin]);

  // Directorio: solo se descarga cuando una pantalla lo necesita
  useEffect(() => {
    if (
      esAdmin &&
      listaDirectorio.length === 0 &&
      (pantallaActual === "admin_maestros" ||
                pantallaActual === "admin_asistencia_evento")
    ) {
      obtenerMaestros();
    }
  }, [esAdmin, pantallaActual]);

  // === EFECTOS EN TIEMPO REAL (ADIÓS AL F5 Y RETRASOS) ===
  useEffect(() => {
    let unsubscribePre = null;
    let unsubscribeAsis = null;
    let unsubscribeUsuario = null;

    // 1. Seguro Anti-F5
    if (
      (pantallaActual === "admin_asistencia_evento" ||
        pantallaActual === "detalle_evento") &&
      !eventoSeleccionado
    ) {
      setPantallaActual(esAdmin ? "admin_eventos" : "eventos");
      return;
    }

    // 2. Tiempo real para el ADMIN
    if (
      esAdmin &&
      pantallaActual === "admin_asistencia_evento" &&
      eventoSeleccionado
    ) {
      // ESCUCHADOR 1: Va a Firebase y trae a los invitados (Pre-asistencias)
      unsubscribePre = db
        .collection("pre_asistencias")
        .where("eventoId", "==", eventoSeleccionado.id)
        .onSnapshot((snapshot) => {
          const listaPre = snapshot.docs.map((doc) =>
            String(doc.data().numEmpleado).trim(),
          );
          setPreRegistradosEvento(listaPre);
        });

      // ESCUCHADOR 2: Va a Firebase y trae los días asistidos (El diccionario multidía)
      unsubscribeAsis = db
        .collection("asistencias")
        .where("eventoId", "==", eventoSeleccionado.id)
        .onSnapshot((snapshot) => {
          const diccionarioAsistencias = {};
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.numEmpleado) {
              // BLINDAJE AL LEER: Quitamos espacios y forzamos números
              const empId = String(data.numEmpleado).trim();
              const diasNum = (data.diasAsistidos || [1]).map((d) => Number(d));
              diccionarioAsistencias[empId] = diasNum;
            }
          });
          setAsistentesFinalesEvento(diccionarioAsistencias);
        });
    }

    // 3. Tiempo real para el USUARIO
    if (!esAdmin && numEmpleado && pantallaActual !== "validacion") {
      // 3.1 Escuchador Global: Descarga todas las invitaciones de este usuario
      unsubscribeUsuario = db
        .collection("pre_asistencias")
        .where("numEmpleado", "==", String(numEmpleado).trim())
        .onSnapshot((snapshot) => {
          // Extraemos solo los IDs de los eventos a los que lo invitaron
          const invitaciones = snapshot.docs.map((doc) => doc.data().eventoId);
          setMisInvitaciones(invitaciones);
        });

      // 3.2 Escuchador Específico: Mantiene viva la pantalla de Detalles del Evento
      if (pantallaActual === "detalle_evento" && eventoSeleccionado) {
        unsubscribePre = db
          .collection("pre_asistencias")
          .where("eventoId", "==", eventoSeleccionado.id)
          .onSnapshot((snapshot) => {
            const listaPre = snapshot.docs.map((doc) =>
              String(doc.data().numEmpleado).trim(),
            );
            setPreRegistradosEvento(listaPre);
          });
      }
    }

    return () => {
      if (unsubscribePre) unsubscribePre();
      if (unsubscribeAsis) unsubscribeAsis();
      if (unsubscribeUsuario) unsubscribeUsuario();
    };
    // ELIMINADO 'pantallaActual'. Solo recargamos Firebase si cambia el evento o el usuario.
  }, [eventoSeleccionado, esAdmin, numEmpleado, pantallaActual === "validacion"]);

    // === COLOR DEL ADMIN PARA EVENTOS INTERNOS ===
  useEffect(() => {
    // No suscribirse mientras se está escribiendo la clave en el login
    if (!numEmpleado || pantallaActual === "validacion") return;
    let primeraLectura = true;
    const unsub = db
      .collection("tema")
      .doc("admin")
      .onSnapshot((snap) => {
        if (snap.exists && snap.data().color) {
          setColorAdminGlobal(snap.data().color);
          // El admin recupera su propio color al entrar
          if (esAdmin && primeraLectura) setColorTema(snap.data().color);
        }
        primeraLectura = false;
      });
    return () => unsub();
  }, [esAdmin, numEmpleado, pantallaActual === "validacion"]);


    // === SEGURIDAD: el modo admin solo existe con sesión real de Firebase ===
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user && sessionStorage.getItem("esAdminFime") === "true") {
        cerrarSesion();
      }
    });
    return () => unsub();
  }, []);


  // === NUEVO: EFECTO DE INACTIVIDAD (3 MINUTOS) ===
  useEffect(() => {
    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => {
          // En lugar de leer el estado, leemos directamente si la sesión sigue viva en memoria
          const adminToken = sessionStorage.getItem("esAdminFime");
          const userToken = sessionStorage.getItem("numEmpleadoFime");

          if (adminToken || userToken) {
            sessionStorage.clear();
            window.location.reload();
          }
          // CORRECCIÓN VITAL: 60 minutos si eres admin (para no interrumpir eventos), 3 minutos si eres usuario normal
        },
        (sessionStorage.getItem("esAdminFime") === "true" ? 60 : 3) * 60 * 1000,
      );
    };

    const eventosUsuario = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    eventosUsuario.forEach((evt) => window.addEventListener(evt, resetTimer));

    resetTimer(); // Iniciar primer conteo

    return () => {
      clearTimeout(timeoutId);
      eventosUsuario.forEach((evt) =>
        window.removeEventListener(evt, resetTimer),
      );
    };
  }, []); // <-- ARRAY VACÍO: Adiós fugas de memoria. Solo se ejecuta una vez.

  // === NUEVO: EFECTO DE AUTODESTRUCCIÓN DE EVENTOS (+15 DÍAS) ===
  useEffect(() => {
    const limpiarEventosCaducados = async () => {
      const todosLosEventos = [...listaEventos, ...listaEventosInternos];
      const eventosParaBorrar = todosLosEventos.filter(
        (ev) => esEventoCaducado(ev) && diasParaEliminacion(ev) === 0,
      );

      if (eventosParaBorrar.length > 0) {
        try {
          // 1. Recolectar TODA la basura asociada al evento antes de borrarlo
          const refsABorrar = [];

          for (const ev of eventosParaBorrar) {
            // Rastrear pre-asistencias huérfanas
            const preSnap = await db
              .collection("pre_asistencias")
              .where("eventoId", "==", ev.id)
              .get();
            preSnap.docs.forEach((doc) => refsABorrar.push(doc.ref));

            // Rastrear firmas huérfanas
            const asisSnap = await db
              .collection("asistencias")
              .where("eventoId", "==", ev.id)
              .get();
            asisSnap.docs.forEach((doc) => refsABorrar.push(doc.ref));

            // Añadir el propio evento a la lista de ejecución
            const coleccion =
              ev.tipo === "interno" ? "eventos_internos_fime" : "eventos_fime";
            refsABorrar.push(db.collection(coleccion).doc(ev.id));
          }

          // 2. Destrucción segura en lotes de 490 para evitar colapso de Firebase
          const CHUNK_SIZE = 490;
          for (let i = 0; i < refsABorrar.length; i += CHUNK_SIZE) {
            const chunk = refsABorrar.slice(i, i + CHUNK_SIZE);
            const batch = db.batch();
            chunk.forEach((ref) => batch.delete(ref));
            await batch.commit();
          }

          // CORRECCIÓN VITAL: Refrescamos la memoria localmente SIN reactivar el bucle hacia Firebase
          setListaEventos((prev) =>
            prev.filter((ev) => !eventosParaBorrar.some((b) => b.id === ev.id)),
          );
          setListaEventosInternos((prev) =>
            prev.filter((ev) => !eventosParaBorrar.some((b) => b.id === ev.id)),
          );
        } catch (error) {
          console.error("Error en autodestrucción:", error);
        }
      }
    };

    // SOLO EL ADMIN TIENE PERMISO DE EJECUTAR LA LIMPIEZA AUTOMÁTICA
    if (
      esAdmin &&
      (listaEventos.length > 0 || listaEventosInternos.length > 0)
    ) {
      limpiarEventosCaducados();
    }
  }, [listaEventos, listaEventosInternos, esAdmin]);

  // Agrega este useEffect justo después de tus otros useEffects globales
  useEffect(() => {
       if (
      qrEventoId &&
      numEmpleado &&
      !esAdmin &&
      pantallaActual !== "confirmar_asistencia"
    ) {
      // Si escaneó un QR y ya estaba logueado, forzar la validación para ir a la firma
      const e = { preventDefault: () => { } };
      manejarValidacion(e);
    }
  }, [qrEventoId]);

  // ==========================================
  // FUNCIONES DE CARGA Y VALIDACIÓN
  // ==========================================
  const obtenerMaestros = async () => {
    try {
      const snapshot = await db.collection("directorio_fime").get();
      const maestrosArreglo = snapshot.docs.map((doc) => ({
        id: doc.id,
        nombreCompleto: doc.data().nombreCompleto || "",
        trayectoria: doc.data().trayectoria || "",
        registrado: doc.data().registrado || false,
      }));
      setListaDirectorio(maestrosArreglo);
    } catch (err) {
      console.error("Error al traer maestros:", err);
    }
  };

  const obtenerEventos = async (tipo = "publico") => {
    try {
      const coleccion =
        tipo === "interno" ? "eventos_internos_fime" : "eventos_fime";
      const snapshot = await db.collection(coleccion).get();
      const eventosArreglo = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (tipo === "interno") {
        setListaEventosInternos(eventosArreglo);
      } else {
        setListaEventos(eventosArreglo);
      }
    } catch (err) {
      console.error("Error al traer eventos:", err);
    }
  };

  const manejarValidacion = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    const inputLimpio = numEmpleado.trim();

    try {
      

      // REGLA MÁXIMA: Si no existe en la Lista de Maestros General, aquí mismo rebota (Público o Interno).
      const docRef = db.collection("directorio_fime").doc(inputLimpio);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const datos = docSnap.data();
        setNombreMaestro(datos.nombreCompleto);
        setColorTema(
          coloresDocente.includes(datos.colorTema)
            ? datos.colorTema
            : "bg-fime-main",
        );
        setEsAdmin(false);

        if (qrEventoId) {
          // --- EL CADENERO DEL QR ---
          let eventoDoc = await db
            .collection("eventos_fime")
            .doc(qrEventoId)
            .get();
          let esInterno = false;

          // Si no lo encuentra en públicos, busca en internos
          if (!eventoDoc.exists) {
            eventoDoc = await db
              .collection("eventos_internos_fime")
              .doc(qrEventoId)
              .get();
            if (eventoDoc.exists) esInterno = true;
          }

          if (!eventoDoc.exists) {
            setError("❌ El evento que escaneaste ya no existe.");
            setCargando(false);
            return;
          }

          // BLINDAJE ANTI-TRAMPAS: Bloquear si el evento ya caducó
          const eventoData = { id: eventoDoc.id, ...eventoDoc.data() };
          if (esEventoCaducado(eventoData)) {
            setError(
              "⏳ Este evento ya ha finalizado. No se aceptan más registros de asistencia.",
            );
            setCargando(false);
            return;
          }

          // Si el evento es interno, exige que el usuario esté específicamente en el Excel de invitados
          if (esInterno) {
            const docIdUnico = `${qrEventoId}_${inputLimpio}`;
            const preSnap = await db
              .collection("pre_asistencias")
              .doc(docIdUnico)
              .get();

            if (!preSnap.exists) {
              setError(
                "⚠️ Acceso denegado: No estás en la lista exclusiva de invitados para esta reunión.",
              );
              setCargando(false);
              return;
            }
          }
          // Si es público, pasa directo porque ya validamos que existe en la Lista de Maestros arriba.
          // --------------------------

          setPantallaActual("confirmar_asistencia");
        } else {
          setPantallaActual("registro");
        }
            } else {
        // No es maestro: se intenta como administrador con Firebase Auth
        try {
                    await auth.signInWithEmailAndPassword(CORREO_ADMIN, inputLimpio);
          setNumEmpleado("ADMIN"); // no dejar la contraseña en memoria ni en sessionStorage
          setNombreMaestro("Administrador"); // cámbialo por el nombre que quieras mostrar
          setEsAdmin(true);
          setPantallaActual("registro");
                } catch (errAuth) {
          //console.error("Error de Auth:", errAuth.code, errAuth.message);
          console.error("Error real de Firebase Auth:", errAuth); // <-- 💡 AGREGA ESTA LÍNEA AQUÍ
          if (errAuth.code === "auth/too-many-requests") {
            setError("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
          } else {
            setError(
              "Acceso denegado. Número de empleado no registrado en la Base de Datos de FIME.",
            );
          }
        }
      }
    } catch (err) {
      console.error("Error al consultar:", err);
      setError("Error de conexión con la base de datos.");
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = () => {
    sessionStorage.clear();
    auth.signOut();
    setPantallaActual("validacion");
    setNumEmpleado("");
    setNombreMaestro("");
    setEsAdmin(false);
    setMenuAbierto(false);
    setModoEdicion(false);
    setMostrarPopup(false);
    setConfirmacionExitosa(false);
    // Vaciamos arreglos de Firebase para no contaminar al siguiente usuario
    setColorTema("bg-fime-main");
    setMisInvitaciones([]);
    setEventoSeleccionado(null);
  };

  const navegarA = (pantalla) => {
    setPantallaActual(pantalla);
    setMenuAbierto(false);
    setModoEdicion(false);
    setEditandoEventoId(null);
    setMostrarPopup(false);
    setResaltarFechas(false);
    setBusquedaMaestros(""); // Limpia el buscador de directorio al cambiar de módulo
    setBusquedaAsistencias(""); // Limpia el buscador de asistencias
  };

  // ==========================================
  // FUNCIONES DE ADMIN (SIMPLIFICADAS POR EL TIEMPO REAL)
  // ==========================================
  const abrirAsistenciasAdmin = (evento) => {
    setEventoSeleccionado(evento);
    navegarA("admin_asistencia_evento");
  };

  const abrirModalQR = (evento) => {
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
      // 1. Buscamos el evento para saber su fecha de inicio y si es multidia
      let eventoDoc = await db.collection("eventos_fime").doc(qrEventoId).get();
      if (!eventoDoc.exists) {
        eventoDoc = await db
          .collection("eventos_internos_fime")
          .doc(qrEventoId)
          .get();
      }

      if (!eventoDoc.exists) {
        alert("❌ Evento no encontrado en la base de datos.");
        setCargando(false);
        return;
      }

      const eventoData = eventoDoc.data();

      // 2. Calculamos qué día es HOY (Forzamos a que sea NÚMERO)
      const fechaHoyLocal = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
      const diaEscaneado = Number(
        calcularDiasEvento(
          eventoData.fecha,
          fechaHoyLocal,
          eventoData.esMultiDia,
        ),
      );

      // BLINDAJE: Limpiamos espacios basura del número de empleado
      const numLimpio = String(numEmpleado).trim();
      const docIdUnico = `${qrEventoId}_${numLimpio}`;

      const docRef = db.collection("asistencias").doc(docIdUnico);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const dataAnterior = docSnap.data();
        if (
          dataAnterior.diasAsistidos &&
          dataAnterior.diasAsistidos
            .map((d) => Number(d))
            .includes(diaEscaneado)
        ) {
          // 1. Calculamos la hora exacta sacándola del timestamp de Firebase
          let horaFirma = "Hora no disponible";
          const timestamp = dataAnterior.ultimaFirma || dataAnterior.fechaFirma;
          if (timestamp && timestamp.toDate) {
            horaFirma = new Date(timestamp.toDate()).toLocaleTimeString(
              "es-MX",
              { hour: "2-digit", minute: "2-digit" },
            );
          }

          // 2. Calculamos la fecha exacta de ese día del evento
          const fechaExacta = obtenerFechaFormateada(
            eventoData.fecha,
            diaEscaneado - 1,
          );

          // 3. Encendemos el popup
          setModalYaRegistrado({
            visible: true,
            dia: diaEscaneado,
            fecha: fechaExacta,
            hora: horaFirma,
          });
          setCargando(false);
          return; // Detenemos la función aquí
        } else {
          // Si ya existía pero es un día nuevo, le sumamos el día al arreglo
          await docRef.update({
            diasAsistidos:
              firebase.firestore.FieldValue.arrayUnion(diaEscaneado),
            ultimaFirma: firebase.firestore.FieldValue.serverTimestamp(),
          });
          setConfirmacionExitosa(true);
        }
      } else {
        // Registro por primera vez
        await docRef.set({
          eventoId: qrEventoId,
          numEmpleado: numLimpio, // ID ultra limpio
          nombreMaestro: nombreMaestro,
          diasAsistidos: [diaEscaneado], // Guardado como número real
          fechaFirma: firebase.firestore.FieldValue.serverTimestamp(),
        });
        setConfirmacionExitosa(true);
      }

      if (
        confirmacionExitosa ||
        !docSnap.exists ||
        (docSnap.exists &&
          !docSnap
            .data()
            .diasAsistidos?.map((d) => Number(d))
            .includes(diaEscaneado))
      ) {
        setTimeout(() => {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
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
  // FUNCIONES DE USUARIO Y EVENTOS (SIMPLIFICADAS)
  // ==========================================
  const abrirDetalleEventoUsuario = (evento) => {
    setEventoSeleccionado(evento);
    setYaRegistrado(misInvitaciones.includes(evento.id)); // <-- ESTO REINICIA LA MEMORIA
    navegarA("detalle_evento");
  };

  const registrarPreAsistencia = async () => {
    if (!eventoSeleccionado) return;
    setCargando(true);

    try {
      const docIdUnico = `${eventoSeleccionado.id}_${numEmpleado}`;
      const docRef = db.collection("pre_asistencias").doc(docIdUnico);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        alert("⚠️ Ya te encuentras registrado para este evento.");
        setYaRegistrado(true);
      } else {
        await docRef.set({
          eventoId: eventoSeleccionado.id,
          numEmpleado: numEmpleado,
          nombreMaestro: nombreMaestro,
          fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
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

  // ==========================================
  // EDICIÓN DE DIRECTORIO Y EVENTOS
  // ==========================================
  const iniciarEdicion = () => {
    setCambiosDirectorio(JSON.parse(JSON.stringify(listaDirectorio)));
    setModoEdicion(true);
    setBusquedaMaestros(""); // Limpia el buscador al entrar a editar
  };
  const cancelarEdicion = () => {
    setModoEdicion(false);
    setCambiosDirectorio([]);
    setBusquedaMaestros(""); // Limpia el buscador al cancelar
  };
  const handleCambioInput = (index, campo, valor) => {
    const nuevaLista = [...cambiosDirectorio];
    nuevaLista[index][campo] = valor;
    setCambiosDirectorio(nuevaLista);
    // Si estás escribiendo en la fila nueva, apagamos el brillo al instante
    if (index === filaNuevaIndex) {
      setFilaNuevaIndex(null);
    }
  };
  const agregarFila = () => {
    setCambiosDirectorio([
      { id: "", nombreCompleto: "", trayectoria: "", registrado: false },
      ...cambiosDirectorio,
    ]);
    setFilaNuevaIndex(0); // El brillo se queda encendido hasta que escribas algo
  };

  const eliminarFila = async (index) => {
    const maestroAEliminar = cambiosDirectorio[index];

    if (!maestroAEliminar.id || maestroAEliminar.id.trim() === "") {
      const nuevaLista = [...cambiosDirectorio];
      nuevaLista.splice(index, 1);
      setCambiosDirectorio(nuevaLista);
      return;
    }

    const confirmacion = window.confirm(
      `⚠️ ¿Estás seguro de eliminar PERMANENTEMENTE a ${maestroAEliminar.nombreCompleto || maestroAEliminar.id}?\n\nEsto borrará de inmediato todo su historial, asistencias y registros en TODOS los eventos. Esta acción NO se puede deshacer.`,
    );
    if (!confirmacion) return;

    setCargando(true);
    try {
      const idLimpio = String(maestroAEliminar.id).trim();
      const refsABorrar = [];

      refsABorrar.push(db.collection("directorio_fime").doc(idLimpio));

      const preSnap = await db
        .collection("pre_asistencias")
        .where("numEmpleado", "==", idLimpio)
        .get();
      preSnap.docs.forEach((doc) => refsABorrar.push(doc.ref));

      const asisSnap = await db
        .collection("asistencias")
        .where("numEmpleado", "==", idLimpio)
        .get();
      asisSnap.docs.forEach((doc) => refsABorrar.push(doc.ref));

      // BORRADO SEGURO CON CHUNK DE 490
      const CHUNK_SIZE = 490;
      for (let i = 0; i < refsABorrar.length; i += CHUNK_SIZE) {
        const chunk = refsABorrar.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();
        chunk.forEach((ref) => batch.delete(ref));
        await batch.commit();
      }

      const nuevaLista = [...cambiosDirectorio];
      nuevaLista.splice(index, 1);
      setCambiosDirectorio(nuevaLista);
      setListaDirectorio((prev) =>
        prev.filter((m) => String(m.id).trim() !== idLimpio),
      );

      alert(
        "🗑️ Maestro y todos sus registros han sido eliminados permanentemente.",
      );
    } catch (error) {
      console.error(error);
      alert("❌ Error al intentar eliminar al maestro de la base de datos.");
    }
    setCargando(false);
  };

  const guardarCambios = async () => {
    setCargando(true);
    try {
      const eliminados = listaDirectorio.filter(
        (orig) => !cambiosDirectorio.some((c) => c.id === orig.id),
      );

      // NUEVO: Promesas para borrar el rastro de los eliminados en todos lados sin saturar el Batch
      const promesasLimpieza = [];

      eliminados.forEach((emp) => {
        const idLimpio = String(emp.id).trim();
        promesasLimpieza.push(
          db.collection("directorio_fime").doc(idLimpio).delete(),
        );

        // Buscar y destruir en pre_asistencias con Chunks
        const p1 = db
          .collection("pre_asistencias")
          .where("numEmpleado", "==", idLimpio)
          .get()
          .then(async (snap) => {
            const CHUNK_SIZE = 490;
            for (let i = 0; i < snap.docs.length; i += CHUNK_SIZE) {
              const chunk = snap.docs.slice(i, i + CHUNK_SIZE);
              const batchBorrado = db.batch();
              chunk.forEach((d) => batchBorrado.delete(d.ref));
              await batchBorrado.commit();
            }
          });

        // Buscar y destruir en asistencias con Chunks
        const p2 = db
          .collection("asistencias")
          .where("numEmpleado", "==", idLimpio)
          .get()
          .then(async (snap) => {
            const CHUNK_SIZE = 490;
            for (let i = 0; i < snap.docs.length; i += CHUNK_SIZE) {
              const chunk = snap.docs.slice(i, i + CHUNK_SIZE);
              const batchBorrado = db.batch();
              chunk.forEach((d) => batchBorrado.delete(d.ref));
              await batchBorrado.commit();
            }
          });

        promesasLimpieza.push(p1, p2);
      });

      // CORRECCIÓN VITAL: Ahorro extremo de recursos en Firebase (Solo actualiza lo que cambió)
      const maestrosValidos = cambiosDirectorio.filter(
        (emp) => emp.id && emp.id.trim() !== "",
      );

      const maestrosAActualizar = maestrosValidos.filter((empMod) => {
        const original = listaDirectorio.find((orig) => orig.id === empMod.id);
        if (!original) return true; // Es un maestro nuevo
        // Retorna true solo si realmente le modificaste el nombre o la trayectoria
        return (
          original.nombreCompleto !== empMod.nombreCompleto ||
          original.trayectoria !== empMod.trayectoria
        );
      });

      const CHUNK_SIZE = 490;
      // Ahora solo recorre e impacta a los maestros que sufrieron un cambio
      for (let i = 0; i < maestrosAActualizar.length; i += CHUNK_SIZE) {
        const chunk = maestrosAActualizar.slice(i, i + CHUNK_SIZE);
        const batchGuardado = db.batch();

        chunk.forEach((emp) => {
          const docRef = db.collection("directorio_fime").doc(emp.id.trim());
          batchGuardado.set(
            docRef,
            {
              nombreCompleto: emp.nombreCompleto,
              trayectoria: emp.trayectoria || "",
              registrado: emp.registrado || false,
            },
            { merge: true },
          );
        });
        await batchGuardado.commit();
      }

      await Promise.all(promesasLimpieza); // Esperamos a que borre toda la basura

      setListaDirectorio(cambiosDirectorio);
      setModoEdicion(false);
      setBusquedaMaestros(""); // Limpia el buscador al guardar con éxito
      alert("✅ Cambios guardados y base de datos limpia con éxito.");
      obtenerMaestros();
    } catch (err) {
      alert("❌ Error al guardar: " + err.message);
    }
    setCargando(false);
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    if (!formEvento.titulo || !formEvento.fecha || !formEvento.descripcion) {
      alert("Por favor completa el título, la fecha y la descripción corta.");
      return;
    }

    // === VALIDADOR ESTRICTO DE TIEMPO ===
    // 1. Evaluamos SIEMPRE la fecha de INICIO, no la de fin
    const horaEvaluar = formEvento.hora || "23:59";

    // Creamos objetos de tiempo real para evitar errores
    const fechaInicioIngresada = new Date(
      `${formEvento.fecha}T${horaEvaluar}:00`,
    );
    const fechaActual = new Date();

    // Si la fecha de inicio ya pasó (ya sea el día o la hora de hoy)
    // CORRECCIÓN: Si estamos editando (!editandoEventoId es falso), ignoramos el bloqueo de tiempo pasado.
    if (!editandoEventoId && fechaInicioIngresada < fechaActual) {
      setMostrarPopupErrorFecha(true);
      return;
    }

    // 2. BLINDAJE EXTRA PARA EVENTOS MULTIDÍA
    if (formEvento.esMultiDia && formEvento.fechaFin) {
      const fechaFinIngresada = new Date(`${formEvento.fechaFin}T23:59:00`);
      if (fechaFinIngresada < new Date(`${formEvento.fecha}T00:00:00`)) {
        alert(
          "⚠️ La fecha de término no puede ser anterior a la fecha de inicio.",
        );
        return;
      }
    }
    if (editandoEventoId) {
      const confirmacion = window.confirm(
        "⚠️ Al modificar este evento, se borrarán las pre-asistencias actuales. ¿Deseas continuar?",
      );
      if (!confirmacion) return;
    }
    setCargando(true);

    // Definir a qué colección se va a guardar según su tipo
    const coleccionDestino =
      formEvento.tipo === "interno" ? "eventos_internos_fime" : "eventos_fime";

    try {
      if (editandoEventoId) {
        await db
          .collection(coleccionDestino)
          .doc(editandoEventoId)
          .update({
            titulo: formEvento.titulo,
            descripcion: formEvento.descripcion,
            fecha: formEvento.fecha,
            fechaFin: formEvento.fechaFin || "", // NUEVO
            hora: formEvento.hora,
            horaFin: formEvento.horaFin || "", // NUEVO
            esMultiDia: formEvento.esMultiDia || false, // NUEVO
            portada: formEvento.portada,
            tipo: formEvento.tipo,
          });
        const snapshotPre = await db
          .collection("pre_asistencias")
          .where("eventoId", "==", editandoEventoId)
          .get();
        if (!snapshotPre.empty) {
          const CHUNK_SIZE = 490;
          for (let i = 0; i < snapshotPre.docs.length; i += CHUNK_SIZE) {
            const chunk = snapshotPre.docs.slice(i, i + CHUNK_SIZE);
            const batch = db.batch();
            chunk.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
          }
        }
        alert(
          "✅ ¡Evento actualizado y pre-asistencias reiniciadas con éxito!",
        );
      } else {
        await db.collection(coleccionDestino).add({
          titulo: formEvento.titulo,
          descripcion: formEvento.descripcion,
          fecha: formEvento.fecha,
          fechaFin: formEvento.fechaFin || "", // NUEVO
          hora: formEvento.hora,
          horaFin: formEvento.horaFin || "", // NUEVO
          esMultiDia: formEvento.esMultiDia || false, // NUEVO
          portada: formEvento.portada,
          tipo: formEvento.tipo || "publico",
          creado: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }

      obtenerEventos("publico");
      obtenerEventos("interno");
      setFormEvento({
        titulo: "",
        descripcion: "",
        fecha: "",
        fechaFin: "",
        hora: "",
        horaFin: "",
        esMultiDia: false,
        portada:
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
        tipo: "publico",
      });
      const tipoGuardado = formEvento.tipo;
      setEditandoEventoId(null);
      navegarA(
        tipoGuardado === "interno" ? "admin_eventos_internos" : "admin_eventos",
      );
    } catch (err) {
      alert("❌ Error al guardar evento: " + err.message);
    }
    setCargando(false);
  };

  const eliminarEvento = async () => {
    if (!editandoEventoId) return;
    const confirmacion = window.confirm(
      "⚠️ ¿Estás seguro de eliminar este evento permanentemente?",
    );
    if (confirmacion) {
      setCargando(true);
      try {
        // Detectamos la colección correcta según si es interno o público
        const coleccionDestino =
          formEvento.tipo === "interno"
            ? "eventos_internos_fime"
            : "eventos_fime";

        await db.collection(coleccionDestino).doc(editandoEventoId).delete();

        // LIMPIEZA PROFUNDA: Borrar todo rastro de pre-asistencias y firmas de este evento
        const refsABorrar = [];

        const preSnap = await db
          .collection("pre_asistencias")
          .where("eventoId", "==", editandoEventoId)
          .get();
        preSnap.docs.forEach((doc) => refsABorrar.push(doc.ref));

        const asisSnap = await db
          .collection("asistencias")
          .where("eventoId", "==", editandoEventoId)
          .get();
        asisSnap.docs.forEach((doc) => refsABorrar.push(doc.ref));

        const CHUNK_SIZE = 490;
        for (let i = 0; i < refsABorrar.length; i += CHUNK_SIZE) {
          const chunk = refsABorrar.slice(i, i + CHUNK_SIZE);
          const batch = db.batch();
          chunk.forEach((ref) => batch.delete(ref));
          await batch.commit();
        }

        alert(
          "🗑️ El evento y todas sus firmas han sido eliminados permanentemente de la base de datos.",
        );
        obtenerEventos("publico");
        obtenerEventos("interno");
        setEditandoEventoId(null);

        // Redirigimos a su pantalla correspondiente
        navegarA(
          formEvento.tipo === "interno"
            ? "admin_eventos_internos"
            : "admin_eventos",
        );
      } catch (err) {
        alert("❌ Error al eliminar el evento: " + err.message);
      }
      setCargando(false);
    }
  };

  const prepararEdicionEvento = (evento) => {
    setFormEvento({
      titulo: evento.titulo || "",
      descripcion: evento.descripcion || "",
      fecha: evento.fecha || "",
      fechaFin: evento.fechaFin || "", // Agregado
      hora: evento.hora || "",
      horaFin: evento.horaFin || "", // Agregado
      portada: evento.portada || "",
      esMultiDia: evento.esMultiDia || false, // Agregado
      tipo: evento.tipo || "publico",
    });
    setEditandoEventoId(evento.id);
    setPantallaActual("registrar_evento");
  };

  // Helper para crear el tono oscuro del panel lateral dinámicamente
  const obtenerColorOscuro = (color) => {
    if (!color) return "bg-fime-dark";
    if (color.includes("sky")) return "bg-sky-900";
    if (color.includes("#c8b28a")) return "bg-[#5c4b2e]";
    if (color.includes("violet")) return "bg-violet-900";
    if (color.includes("fuchsia")) return "bg-fuchsia-900";
    if (color.includes("purple")) return "bg-purple-900";
    if (color.includes("pink")) return "bg-pink-900";
    if (color.includes("orange")) return "bg-orange-900";
    if (color.includes("yellow")) return "bg-yellow-900";
    if (color.includes("blue")) return "bg-blue-900";
    return "bg-fime-dark";
  };

  const themeBg = colorTema || "bg-fime-main";
  const themeDarkBg = obtenerColorOscuro(colorTema);

  // Convierte el color de fondo del tema en su versión de texto (para la "A" del logo)
  const mapaTextoTema = {
    "bg-pink-500": "text-pink-500",
    "bg-orange-400": "text-orange-400",
    "bg-yellow-500": "text-yellow-500",
    "bg-blue-800": "text-blue-800",
    "bg-fime-main": "text-fime-main",
    "bg-sky-400": "text-sky-400",
    "bg-[#c8b28a]": "text-[#c8b28a]",
    "bg-violet-400": "text-violet-400",
    "bg-fuchsia-600": "text-fuchsia-600",
    "bg-purple-600": "text-purple-600",
  };
  const themeTextColor = mapaTextoTema[colorTema] || "text-fime-main";
  const themeHover = "hover:brightness-90 transition-all";
  const themeText = "text-fime-main";
  const themeTextDark = "text-white";
  const themeBorder = "border-gray-200";
  const themeLightBg = "bg-gray-100";

  // ==========================================
  // EXPORTACIÓN A EXCEL Y PDF
  // ==========================================

  const exportarDirectorio = () => {
    // 1. Mapeamos la lista general con los encabezados exactos que pide el sistema
    const datosExportar = maestrosFiltradosGeneral.map((m) => ({
      TRAYECTORIA: m.trayectoria || "",
      "NO. EMPLEADO": m.id,
      "NOMBRE DEL DOCENTE": m.nombreCompleto,
    }));

    // 2. Creamos y descargamos el Excel
    const worksheet = XLSX.utils.json_to_sheet(datosExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Directorio_FIME");
    XLSX.writeFile(workbook, `Directorio_General_FIME.xlsx`);
  };

  // === NUEVA FUNCIÓN: EXPORTAR SOLO LOS SELECCIONADOS ===
  const exportarSeleccion = () => {
    if (maestrosSeleccionados.length === 0) {
      alert("⚠️ Selecciona al menos un maestro para descargar.");
      return;
    }
    const datosExportar = listaDirectorio
      .filter((m) => maestrosSeleccionados.includes(m.id))
      .map((m) => ({
        "NO. EMPLEADO": m.id,
        "NOMBRE DEL DOCENTE": m.nombreCompleto,
      }));

    const worksheet = XLSX.utils.json_to_sheet(datosExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invitados");
    XLSX.writeFile(workbook, `Invitados_Seleccionados.xlsx`);

    // Limpiamos y salimos del modo
    setModoSeleccionDescarga(false);
    setMaestrosSeleccionados([]);
  };

  const cargarTodosLosMaestrosEventoInterno = async () => {
    if (!eventoSeleccionado) return;
    const confirmacion = window.confirm(
      "¿Estás seguro de registrar a TODOS los maestros del directorio general en este evento?",
    );
    if (!confirmacion) return;

    setCargando(true);
    try {
      const numEmpleadosNuevos = [];
      const CHUNK_SIZE = 490; // Salvavidas de Firebase

      for (let i = 0; i < listaDirectorio.length; i += CHUNK_SIZE) {
        const chunk = listaDirectorio.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();

        chunk.forEach((maestro) => {
          const idLimpio = String(maestro.id).trim();
          const docIdUnico = `${eventoSeleccionado.id}_${idLimpio}`;
          const preAsisRef = db.collection("pre_asistencias").doc(docIdUnico);

          batch.set(preAsisRef, {
            eventoId: eventoSeleccionado.id,
            numEmpleado: idLimpio,
            nombreMaestro: maestro.nombreCompleto,
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
          });
          numEmpleadosNuevos.push(idLimpio);
        });
        await batch.commit(); // Subimos el bloque actual y pasamos al siguiente
      }

      setPreRegistradosEvento((prev) => [
        ...new Set([...(prev || []), ...numEmpleadosNuevos]),
      ]);
      alert(
        `✅ Carga masiva exitosa. Se registraron ${listaDirectorio.length} maestros en el evento.`,
      );
    } catch (error) {
      console.error(error);
      alert("❌ Error al cargar la lista de maestros.");
    }
    setCargando(false);
  };

  // === NUEVO: DESCARGAR HISTÓRICO DIRECTO (ADMIN) BLINDADO ===
  const descargarHistoricoAdmin = async (evento) => {
    setCargando(true);
    try {
      // 1. SEGURO: Si el directorio está vacío en memoria, lo descargamos de emergencia
      let directorioActual = listaDirectorio;
      if (directorioActual.length === 0) {
        const dirSnap = await db.collection("directorio_fime").get();
        directorioActual = dirSnap.docs.map((doc) => ({
          id: doc.id,
          nombreCompleto: doc.data().nombreCompleto || "",
        }));
        setListaDirectorio(directorioActual);
      }

      // Traemos pre-asistencias
      const preSnap = await db
        .collection("pre_asistencias")
        .where("eventoId", "==", evento.id)
        .get();
      const preIds = preSnap.docs.map((doc) =>
        String(doc.data().numEmpleado).trim(),
      );

      // Traemos asistencias finales
      const asisSnap = await db
        .collection("asistencias")
        .where("eventoId", "==", evento.id)
        .get();
      const asisDict = {};
      asisSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.numEmpleado)
          asisDict[String(data.numEmpleado).trim()] = (
            data.diasAsistidos || [1]
          ).map(Number);
      });

      const numDias = calcularDiasEvento(
        evento.fecha,
        evento.fechaFin,
        evento.esMultiDia,
      );

      // Usamos directorioActual que ya está blindado
      const maestrosAExportar = directorioActual.filter((m) =>
        evento.tipo === "interno" ? preIds.includes(m.id) : true,
      );

      const datosExportar = maestrosAExportar.map((m) => {
        const fila = {
          "NO. EMPLEADO": m.id,
          "NOMBRE DEL DOCENTE": m.nombreCompleto,
        };
        if (evento.tipo !== "interno")
          fila["PRE-ASISTENCIA"] = preIds.includes(m.id) ? "SI" : "NO";
        for (let i = 1; i <= numDias; i++) {
          const nombreColumna = obtenerFechaFormateada(
            evento.fecha,
            i - 1,
          ).toUpperCase();
          fila[nombreColumna] = asisDict[m.id]?.includes(i) ? "SI" : "NO";
        }
        return fila;
      });

      const worksheet = XLSX.utils.json_to_sheet(datosExportar);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
      XLSX.writeFile(workbook, `Historial_${evento.titulo}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("❌ Error al descargar el archivo histórico.");
    }
    setCargando(false);
  };

  const exportarLista = (formato) => {
    if (!eventoSeleccionado) return;

    const numDias = calcularDiasEvento(
      eventoSeleccionado.fecha,
      eventoSeleccionado.fechaFin,
      eventoSeleccionado.esMultiDia,
    );

    const maestrosAExportar = maestrosFiltradosAsistencia.filter((maestro) =>
      eventoSeleccionado.tipo === "interno"
        ? preRegistradosEvento.includes(maestro.id)
        : true,
    );

    const datosExportar = maestrosAExportar.map((m) => {
      const fila = {
        "NO. EMPLEADO": m.id,
        "NOMBRE DEL DOCENTE": m.nombreCompleto,
      };

      if (eventoSeleccionado.tipo !== "interno") {
        fila["PRE-ASISTENCIA"] = preRegistradosEvento.includes(m.id)
          ? "SI"
          : "NO";
      }

      // Agregamos una columna por cada día del evento
      // Agregamos una columna por cada día del evento con la fecha exacta
      for (let i = 1; i <= numDias; i++) {
        const asistio = asistentesFinalesEvento[m.id]?.includes(i);
        const nombreColumna = obtenerFechaFormateada(
          eventoSeleccionado.fecha,
          i - 1,
        ).toUpperCase();
        fila[nombreColumna] = asistio ? "SI" : "NO";
      }

      return fila;
    });

    if (formato === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(datosExportar);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencias");
      XLSX.writeFile(workbook, `Asistencias_${eventoSeleccionado.titulo}.xlsx`);
    } else if (formato === "pdf") {
      const doc = new window.jspdf.jsPDF();
      doc.text(`Reporte de Asistencias: ${eventoSeleccionado.titulo}`, 14, 15);

      const encabezadosPDF = ["NO. EMPLEADO", "NOMBRE DEL DOCENTE"];
      if (eventoSeleccionado.tipo !== "interno")
        encabezadosPDF.push("PRE-ASISTENCIA");
      for (let i = 1; i <= numDias; i++)
        encabezadosPDF.push(
          obtenerFechaFormateada(eventoSeleccionado.fecha, i - 1).toUpperCase(),
        );

      const cuerpoPDF = datosExportar.map((d) => {
        const filaDoc = [d["NO. EMPLEADO"], d["NOMBRE DEL DOCENTE"]];
        if (eventoSeleccionado.tipo !== "interno")
          filaDoc.push(d["PRE-ASISTENCIA"]);
        for (let i = 1; i <= numDias; i++)
          filaDoc.push(
            d[
            obtenerFechaFormateada(
              eventoSeleccionado.fecha,
              i - 1,
            ).toUpperCase()
            ],
          );
        return filaDoc;
      });

      doc.autoTable({
        head: [encabezadosPDF],
        body: cuerpoPDF,
        startY: 25,
      });
      doc.save(`Asistencias_${eventoSeleccionado.titulo}.pdf`);
    }

    // Cierra el menú automáticamente al terminar
    setMenuDescargaAbierto(false);
  };

  const procesarArchivoLista = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.name.endsWith(".pdf")) {
      alert(
        "⚠️ Sube un archivo Excel (.xlsx) para garantizar que los números se vinculen correctamente.",
      );
      return;
    }

    setCargando(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];

        const filas = XLSX.utils.sheet_to_json(wb.Sheets[wsname], {
          header: 1,
        });
        let agregados = 0;
        const numEmpleadosNuevos = [];

        const normalizar = (texto) =>
          String(texto)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        let idxFilaTitulos = -1;
        let idxColEmp = -1;
        let idxColNom = -1;

        for (let i = 0; i < Math.min(10, filas.length); i++) {
          const fila = filas[i];
          if (!fila || fila.length === 0) continue;

          idxColEmp = fila.findIndex(
            (celda) =>
              celda &&
              (normalizar(celda).includes("empleado") ||
                normalizar(celda).includes("matricula") ||
                normalizar(celda).includes("emp")),
          );
          idxColNom = fila.findIndex(
            (celda) =>
              celda &&
              (normalizar(celda).includes("nombre") ||
                normalizar(celda).includes("docente") ||
                normalizar(celda).includes("maestro")),
          );

          if (idxColEmp !== -1 && idxColNom !== -1) {
            idxFilaTitulos = i;
            break;
          }
        }

        if (idxFilaTitulos === -1) {
          alert(
            "⚠️ El sistema no pudo encontrar las columnas de 'No. Empleado' y 'Nombre'.",
          );
          setCargando(false);
          e.target.value = null;
          return;
        }

        // CORRECCIÓN: Separamos los datos a subir en un arreglo temporal
        const datosExtraidos = [];
        for (let i = idxFilaTitulos + 1; i < filas.length; i++) {
          const numEmpRaw = filas[i][idxColEmp];
          const nombreRaw = filas[i][idxColNom];

          if (
            numEmpRaw !== undefined &&
            numEmpRaw !== null &&
            String(numEmpRaw).trim() !== ""
          ) {
            datosExtraidos.push({
              numEmpStr: String(numEmpRaw).trim(),
              nombreDocente: nombreRaw
                ? String(nombreRaw).trim()
                : "SIN NOMBRE",
            });
          }
        }

        // CORRECCIÓN: Procesamos en Lotes (Batches) de 240 para no romper el límite de Firebase
        const CHUNK_SIZE = 240;
        for (let i = 0; i < datosExtraidos.length; i += CHUNK_SIZE) {
          const chunk = datosExtraidos.slice(i, i + CHUNK_SIZE);
          const batch = db.batch();

          chunk.forEach(({ numEmpStr, nombreDocente }) => {
            const docRef = db.collection("directorio_fime").doc(numEmpStr);
            batch.set(
              docRef,
              { nombreCompleto: nombreDocente, registrado: true },
              { merge: true },
            );

            if (eventoSeleccionado) {
              const docIdUnico = `${eventoSeleccionado.id}_${numEmpStr}`;
              const preAsisRef = db
                .collection("pre_asistencias")
                .doc(docIdUnico);
              batch.set(preAsisRef, {
                eventoId: eventoSeleccionado.id,
                numEmpleado: numEmpStr,
                nombreMaestro: nombreDocente,
                fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
              });
              numEmpleadosNuevos.push(numEmpStr);
            }
            agregados++;
          });
          await batch.commit(); // Subimos el lote actual
        }

        if (eventoSeleccionado) {
          setPreRegistradosEvento((prev) => [
            ...new Set([...(prev || []), ...numEmpleadosNuevos]),
          ]);
        }

        alert(
          `✅ Carga exitosa. Se detectaron y registraron ${agregados} maestros.`,
        );
        obtenerMaestros();
      } catch (error) {
        console.error(error);
        alert("❌ Error al procesar el archivo Excel.");
      } finally {
        setCargando(false);
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const eliminarExcelCargado = async () => {
    const confirmacion = window.confirm(
      "⚠️ ¿Estás seguro de eliminar a todos los invitados de este evento? Esta acción vaciará la lista permanentemente.",
    );
    if (!confirmacion) return;

    setCargando(true);
    try {
      const snapshotPre = await db
        .collection("pre_asistencias")
        .where("eventoId", "==", eventoSeleccionado.id)
        .get();

      if (!snapshotPre.empty) {
        const CHUNK_SIZE = 490;
        for (let i = 0; i < snapshotPre.docs.length; i += CHUNK_SIZE) {
          const chunk = snapshotPre.docs.slice(i, i + CHUNK_SIZE);
          const batch = db.batch();

          chunk.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
      }

      // Vaciamos la memoria visual al instante
      setPreRegistradosEvento([]);
      alert("🗑️ Lista de invitados eliminada correctamente.");
    } catch (error) {
      console.error(error);
      alert("❌ Error al eliminar el archivo.");
    }
    setCargando(false);
  };

  // ==========================================
  // FILTROS DE BÚSQUEDA EN TIEMPO REAL
  // ==========================================
  const maestrosFiltradosGeneral = listaDirectorio.filter(
    (m) =>
      m.nombreCompleto.toLowerCase().includes(busquedaMaestros.toLowerCase()) ||
      m.id.toLowerCase().includes(busquedaMaestros.toLowerCase()),
  );

  const maestrosFiltradosAsistencia = listaDirectorio.filter(
    (m) =>
      m.nombreCompleto
        .toLowerCase()
        .includes(busquedaAsistencias.toLowerCase()) ||
      m.id.toLowerCase().includes(busquedaAsistencias.toLowerCase()),
  );

  // ==============================================================
  // PANTALLAS DE INICIO (PANTALLA COMPLETA, SIN MENÚ)
  // ==============================================================
  if (
    pantallaActual === "validacion" ||
    pantallaActual === "registro" ||
    pantallaActual === "confirmar_asistencia"
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {pantallaActual === "validacion" && (
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border-t-8 border-fime-main relative">
            {qrEventoId && (
              <div className="absolute -top-4 right-0 left-0 mx-auto w-max bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                Mode:Asistencia Rápida ⚡
              </div>
            )}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-fime-light rounded-full mx-auto mb-4 border-2 border-fime-main flex items-center justify-center">
                <span className="text-fime-main font-bold text-2xl">FIME</span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-800">Asistfy</h2>
              <p className="text-gray-500 text-sm mt-1 font-medium">
                Coordinación de Mecánica y Eléctrica
              </p>
            </div>

            <form onSubmit={manejarValidacion} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Clave de Acceso
                </label>
                <div className="relative w-full">
                  <input
                    type={mostrarPassword ? "text" : "password"}
                    value={numEmpleado}
                    onChange={(e) => setNumEmpleado(e.target.value)}
                    placeholder="Ingresa tu clave"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fime-main pr-12"
                    required
                    disabled={cargando}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    disabled={cargando}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
                  >
                    {mostrarPassword ? "🙈" : "👁️"}
                  </button>
                </div>
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
                {cargando ? "Consultando..." : "Verificar Identidad"}
              </button>
            </form>
          </div>
        )}

        {pantallaActual === "registro" && (
          <div
            className={`bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center border-t-8 ${themeBorder}`}
          >
            <div
              className={`w-16 h-16 ${themeLightBg} ${themeText} rounded-full mx-auto mb-4 flex items-center justify-center text-3xl`}
            >
              ✓
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              ¡Bienvenid{esAdmin ? "a" : "o"}!
            </h2>
            <p className="text-gray-800 font-bold mb-1">{nombreMaestro}</p>

            {esAdmin ? (
              <p className="text-sky-600 text-sm font-bold mb-6 mt-2">
                🛡️ Modo Administrador Activado
              </p>
            ) : (
              <p className="text-gray-600 text-sm mb-6">
                Identidad confirmada en el directorio FIME.
              </p>
            )}

            <button
              onClick={() => navegarA(esAdmin ? "admin_eventos" : "eventos")}
              className={`w-full ${themeBg} text-white py-3 px-4 rounded-lg font-bold ${themeHover} transition-all`}
            >
              Entrar al Sistema
            </button>
          </div>
        )}

        {pantallaActual === "confirmar_asistencia" && (
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center border-t-8 border-green-500 transform transition-all">
            {!confirmacionExitosa ? (
              <>
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full mx-auto mb-5 border-4 border-white flex items-center justify-center shadow-inner text-4xl">
                  👋
                </div>
                <h2 className="text-2xl font-extrabold text-gray-800 mb-1">
                  ¡Hola de nuevo!
                </h2>
                <p className="text-gray-800 font-bold mb-6">{nombreMaestro}</p>
                <p className="text-gray-500 text-sm mb-8 font-medium">
                  Estás a un paso de confirmar tu asistencia en sala para el
                  evento.
                </p>

                <button
                  onClick={registrarAsistenciaFinal}
                  disabled={cargando}
                  className="w-full bg-green-600 text-white py-4 px-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md flex justify-center items-center gap-2 text-lg"
                >
                  {cargando ? "Registrando firma..." : "Confirmar Asistencia"}
                </button>
                <button
                  onClick={cerrarSesion}
                  className="mt-4 text-gray-400 text-sm font-bold hover:text-gray-600"
                >
                  Cancelar y Salir
                </button>
              </>
            ) : (
              <div className="animate-bounce-short">
                <div className="w-20 h-20 bg-fime-light text-fime-main rounded-full mx-auto mb-5 border-4 border-white flex items-center justify-center shadow-inner text-4xl">
                  🎉
                </div>
                <h2 className="text-2xl font-extrabold text-gray-800 mb-2">
                  ¡Confirmación Exitosa!
                </h2>
                <p className="text-gray-600 mb-6 font-medium leading-relaxed">
                  Gracias por asistir al evento. Que lo disfrutes.
                </p>
                <p className="text-fime-main text-xs font-bold animate-pulse">
                  Cerrando sesión de forma segura...
                </p>
              </div>
            )}
          </div>
        )}

        {/* NUEVO MODAL: ASISTENCIA DUPLICADA */}
        {modalYaRegistrado.visible && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border-t-4 border-amber-500 transform scale-100 transition-all">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-4 shadow-inner text-3xl">
                ⚠️
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">
                Asistencia Duplicada
              </h3>
              <p className="text-sm text-gray-600 mb-5 font-medium">
                Ya habías registrado tu asistencia para este día previamente.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-200 shadow-inner">
                <p className="text-sm text-gray-700 mb-2">
                  📅 <strong>Día del evento:</strong> Día{" "}
                  {modalYaRegistrado.dia}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  📆 <strong>Fecha:</strong> {modalYaRegistrado.fecha}
                </p>
                <p className="text-sm text-gray-700">
                  ⏰ <strong>Hora de registro:</strong> {modalYaRegistrado.hora}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalYaRegistrado({
                    visible: false,
                    dia: "",
                    fecha: "",
                    hora: "",
                  });
                  // Limpiamos la URL y la sesión para dejar listo el dispositivo
                  window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname,
                  );
                  setQrEventoId(null);
                  cerrarSesion();
                }}
                className="w-full inline-flex justify-center rounded-xl border border-transparent bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 shadow-md transition-colors"
              >
                Entendido
              </button>
            </div>
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
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMenuAbierto(false)}
        ></div>
      )}

      <aside
        className={`fixed md:relative z-40 h-full w-64 ${themeDarkBg} text-white flex flex-col shadow-xl flex-shrink-0 transition-transform duration-300 ease-in-out ${menuAbierto ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 bg-white rounded-full flex items-center justify-center ${themeTextColor} font-bold`}
            >
              A
            </div>
            <span className="font-bold text-lg tracking-wide">Asistfy</span>
          </div>
        </div>

        <div className="p-6 text-center border-b border-white/10 relative">
          {esAdmin && <div className="absolute top-4 right-4 text-xl">🛡️</div>}
          <div className="relative inline-block w-full">
            <button
              onClick={() => setMostrarMenuColor(!mostrarMenuColor)}
              className={`w-20 h-20 ${themeBg} hover:opacity-80 transition-opacity rounded-full mx-auto mb-3 border-4 border-white/20 flex items-center justify-center text-2xl font-bold shadow-lg text-white cursor-pointer`}
            >
              {nombreMaestro ? nombreMaestro.charAt(0) : "U"}
            </button>
            {mostrarMenuColor && (
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2 mt-4 p-2 bg-white rounded-lg shadow-xl border flex flex-wrap justify-center w-40 gap-2 z-50">
                {coloresDisponibles.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setColorTema(color);
                      if (esAdmin) {
                        db.collection("tema").doc("admin").set({ color }).catch((err) => {
                          console.error("No se pudo guardar el color:", err);
                          alert("⚠️ No se pudo guardar el color para los usuarios. Revisa las reglas de Firestore.");
                        });
                      }
                      if (!esAdmin && numEmpleado) {
                        db.collection("directorio_fime")
                          .doc(String(numEmpleado).trim())
                          .update({ colorTema: color })
                          .catch((err) =>
                            console.error("No se pudo guardar el color:", err),
                          );
                      }
                      setMostrarMenuColor(false);
                    }}
                    className={`w-6 h-6 rounded-full ${color} border border-gray-300 hover:scale-110 transition shadow-sm`}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="font-semibold text-sm truncate px-2 mt-2">
            {nombreMaestro}
          </p>
          <p className="text-xs text-white/60 mt-1">
            {esAdmin ? "Coordinación" : `No. Emp: ${numEmpleado}`}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/40 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
          {esAdmin ? (
            <>
              <div className="pt-2 pb-1">
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider px-4">
                  Administración
                </p>
              </div>
              <button
                onClick={() => navegarA("admin_eventos")}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === "admin_eventos" || (pantallaActual === "admin_asistencia_evento" && eventoSeleccionado?.tipo !== "interno" && !esEventoCaducado(eventoSeleccionado)) ? `${themeBg} text-white` : "hover:bg-white/10 text-white/80"}`}
              >
                <span>📅 Eventos Públicos</span>
              </button>
              {/* NUEVO BOTÓN: EVENTOS INTERNOS */}
              <button
                onClick={() => navegarA("admin_eventos_internos")}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === "admin_eventos_internos" || (pantallaActual === "admin_asistencia_evento" && eventoSeleccionado?.tipo === "interno" && !esEventoCaducado(eventoSeleccionado)) ? `${themeBg} text-white` : "hover:bg-white/10 text-white/80"}`}
              >
                <span>📅 Eventos Internos (Admin)</span>
              </button>
              <button
                onClick={() => navegarA("eventos_recientes")}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === "eventos_recientes" || (pantallaActual === "admin_asistencia_evento" && esEventoCaducado(eventoSeleccionado)) ? `${themeBg} text-white` : "hover:bg-white/10 text-white/80"}`}
              >
                <span>🕒 Historial / Recientes</span>
              </button>
              <button
                onClick={() => navegarA("admin_maestros")}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === "admin_maestros" ? `${themeBg} text-white` : "hover:bg-white/10 text-white/80"}`}
              >
                <span>📋 Lista Maestros Registro</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navegarA("eventos")}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === "eventos" || pantallaActual === "detalle_evento" ? `${themeBg} text-white` : "hover:bg-white/10 text-white/80"}`}
              >
                <span>📅 Inicio / Eventos</span>
              </button>
              <button
                onClick={() => navegarA("mis_eventos")}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-3 ${pantallaActual === "mis_eventos" ? `${themeBg} text-white` : "hover:bg-white/10 text-white/80"}`}
              >
                <span>🎟 Mis Registros</span>
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={cerrarSesion}
            className="w-full bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-bold transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col h-full bg-gray-50">
        <header className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className={`w-8 h-8 ${themeBg} rounded-full flex items-center justify-center text-white font-bold text-xs`}
            >
              A
            </div>
            <span className="font-bold text-gray-800">Asistfy</span>
          </div>
          <button
            onClick={() => setMenuAbierto(true)}
            className={`text-gray-600 hover:${themeText} focus:outline-none`}
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
        </header>

        <div className="p-6 md:p-8 flex-1 flex flex-col">
          {(pantallaActual === "admin_eventos" ||
            pantallaActual === "admin_eventos_internos") &&
            esAdmin && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                    {pantallaActual === "admin_eventos"
                      ? "Eventos Públicos"
                      : "Eventos Internos (Administrativos)"}
                  </h2>
                  <button
                    onClick={() => {
                      setEditandoEventoId(null);
                      setFormEvento({
                        titulo: "",
                        descripcion: "",
                        fecha: "",
                        fechaFin: "", // Agregado
                        hora: "",
                        horaFin: "", // Agregado
                        esMultiDia: false, // Agregado
                        portada:
                          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
                        tipo:
                          pantallaActual === "admin_eventos"
                            ? "publico"
                            : "interno",
                      });
                      navegarA("registrar_evento");
                    }}
                    className={`${themeBg} text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:opacity-90`}
                  >
                    ➕ Nuevo Evento
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(pantallaActual === "admin_eventos"
                    ? listaEventos
                    : listaEventosInternos
                  )
                    .filter((evento) => !esEventoCaducado(evento))
                    .map((evento) => (
                      <div
                        key={evento.id}
                        className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col border border-gray-100"
                      >
                        <div className="h-40 bg-gray-200 relative overflow-hidden">
                          <img
                            src={evento.portada}
                            alt={evento.titulo}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            {evento.tipo === "interno" && (
                              <span
                                className={`${colorTema} text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1`}
                              >
                                🔒 INTERNO
                              </span>
                            )}
                            <h3 className="text-lg font-bold text-gray-800">
                              {evento.titulo}
                            </h3>
                            <p className="text-gray-500 text-xs mt-1">
                              📅 {evento.fecha}{" "}
                              {evento.esMultiDia && evento.fechaFin
                                ? `al ${evento.fechaFin}`
                                : ""}{" "}
                              • {evento.hora || "Por definir"}{" "}
                              {evento.horaFin ? `- ${evento.horaFin}` : ""}
                            </p>
                            <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                              {evento.descripcion}
                            </p>
                          </div>

                          <div className="mt-5 pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
                            <button
                              onClick={() => abrirAsistenciasAdmin(evento)}
                              className="text-sky-600 text-sm font-bold hover:underline whitespace-nowrap"
                            >
                              Ver Asistencias →
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={() => abrirModalQR(evento)}
                                disabled={
                                  evento.tipo === "interno" &&
                                  esEventoFuturo(evento.fecha)
                                }
                                className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1 ${evento.tipo === "interno" && esEventoFuturo(evento.fecha) ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-black hover:bg-gray-800 text-white"}`}
                                title={
                                  evento.tipo === "interno" &&
                                    esEventoFuturo(evento.fecha)
                                    ? "El QR se habilitará el día del evento"
                                    : "Mostrar QR de Asistencia"
                                }
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

                  {(pantallaActual === "admin_eventos"
                    ? listaEventos
                    : listaEventosInternos
                  ).length === 0 && (
                      <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                        <p className="font-medium text-lg">
                          No hay eventos registrados en esta sección.
                        </p>
                      </div>
                    )}
                </div>

                {mostrarModalQR && (
                  <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setMostrarModalQR(false)}
                  >
                    <div
                      className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-2xl font-extrabold text-gray-800 mb-2">
                        Acceso Rápido
                      </h3>
                      <p className="text-gray-500 text-sm mb-6">
                        Pide a los maestros escanear este código en la puerta
                        para confirmar asistencia.
                      </p>

                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 inline-block mb-6 shadow-inner">
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

          {pantallaActual === "admin_asistencia_evento" &&
            esAdmin &&
            eventoSeleccionado && (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <button
                      onClick={() =>
                        navegarA(
                          esEventoCaducado(eventoSeleccionado)
                            ? "eventos_recientes"
                            : eventoSeleccionado?.tipo === "interno"
                              ? "admin_eventos_internos"
                              : "admin_eventos",
                        )
                      }
                      className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
                    >
                      ← Regresar
                    </button>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                      {eventoSeleccionado?.titulo}
                    </h2>
                  </div>
                  <div className="flex gap-2 relative">
                    {eventoSeleccionado?.tipo === "interno" &&
                      !esEventoCaducado(eventoSeleccionado) && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setMostrarModalAgregarMaestro(true)}
                            className="bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center"
                          >
                            ➕ Maestro Manual
                          </button>
                          <button
                            onClick={cargarTodosLosMaestrosEventoInterno}
                            disabled={cargando}
                            className="bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center"
                          >
                            👥 Cargar Todos
                          </button>
                          <label className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center cursor-pointer">
                            <span>📁 Subir Excel</span>
                            <input
                              type="file"
                              accept=".xlsx, .xls"
                              onChange={procesarArchivoLista}
                              className="hidden"
                            />
                          </label>
                          {preRegistradosEvento &&
                            preRegistradosEvento.length > 0 && (
                              <button
                                onClick={eliminarExcelCargado}
                                disabled={cargando}
                                className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center"
                              >
                                🗑️ Vaciar
                              </button>
                            )}
                        </div>
                      )}

                    <div className="relative">
                      <button
                        onClick={() =>
                          setMenuDescargaAbierto(!menuDescargaAbierto)
                        }
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
                      >
                        📥 Descargar ▼
                      </button>
                      {menuDescargaAbierto && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-50">
                          <button
                            onClick={() => exportarLista("xlsx")}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm font-bold text-green-700"
                          >
                            📊 Como Excel (.xlsx)
                          </button>
                          <button
                            onClick={() => exportarLista("pdf")}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm font-bold text-red-600"
                          >
                            📄 Como PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* NUEVO: BARRA DE BÚSQUEDA EN EL EVENTO */}
                <input
                  type="text"
                  value={busquedaAsistencias}
                  onChange={(e) => setBusquedaAsistencias(e.target.value)}
                  placeholder="🔍 Buscar maestro por nombre o número"
                  className="w-full mb-4 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-400 outline-none"
                />

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                  {/* VARIABLE QUE CALCULA LOS DÍAS EN VIVO */}
                  {(() => {
                    const numDias = eventoSeleccionado?.fecha
                      ? calcularDiasEvento(
                        eventoSeleccionado.fecha,
                        eventoSeleccionado.fechaFin,
                        eventoSeleccionado.esMultiDia,
                      )
                      : 1;

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="p-4 text-sm font-bold text-gray-600">
                                NO. EMPLEADO
                              </th>
                              <th className="p-4 text-sm font-bold text-gray-600">
                                NOMBRE DEL DOCENTE
                              </th>
                              {eventoSeleccionado?.tipo !== "interno" && (
                                <th className="p-4 text-sm font-bold text-gray-600 text-center">
                                  PRE-ASISTENCIA
                                </th>
                              )}
                              {[...Array(numDias)].map((_, index) => (
                                <th
                                  key={index}
                                  className="p-4 text-sm font-bold text-gray-600 text-center"
                                >
                                  {obtenerFechaFormateada(
                                    eventoSeleccionado.fecha,
                                    index,
                                  ).toUpperCase()}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {maestrosFiltradosAsistencia
                              .filter((maestro) =>
                                eventoSeleccionado?.tipo === "interno"
                                  ? (preRegistradosEvento || []).some(
                                    (idPre) =>
                                      String(idPre).trim() ===
                                      String(maestro.id).trim(),
                                  )
                                  : true,
                              )
                              .map((maestro) => (
                                <tr
                                  key={maestro.id}
                                  className="hover:bg-gray-50 transition-colors"
                                >
                                  <td className="p-4 text-sm font-semibold text-gray-700">
                                    {maestro.id}
                                  </td>
                                  <td className="p-4 text-sm text-gray-800 font-medium">
                                    {maestro.nombreCompleto}
                                  </td>
                                  {eventoSeleccionado?.tipo !== "interno" && (
                                    <td className="p-4 text-center text-xl">
                                      {preRegistradosEvento.includes(
                                        String(maestro.id).trim(),
                                      )
                                        ? "✅"
                                        : "❗"}
                                    </td>
                                  )}
                                  {[...Array(numDias)].map((_, index) => {
                                    const diaColumna = index + 1;
                                    const idLimpio = String(maestro.id).trim();
                                    const asistioEseDia =
                                      asistentesFinalesEvento[
                                        idLimpio
                                      ]?.includes(diaColumna);

                                    return (
                                      <td
                                        key={index}
                                        className="p-4 text-center text-xl bg-gray-50/30 border-l border-gray-100"
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            if (
                                              !esEventoCaducado(
                                                eventoSeleccionado,
                                              )
                                            ) {
                                              toggleAsistenciaManual(
                                                maestro,
                                                diaColumna,
                                              );
                                            }
                                          }}
                                          className={`w-full h-full py-2 flex items-center justify-center focus:outline-none select-none ${esEventoCaducado(eventoSeleccionado) ? "cursor-default opacity-80" : "hover:scale-125 transition-transform cursor-pointer"}`}
                                          title={
                                            esEventoCaducado(eventoSeleccionado)
                                              ? "Archivo Histórico (Solo lectura)"
                                              : asistioEseDia
                                                ? "Quitar asistencia"
                                                : "Marcar asistencia"
                                          }
                                        >
                                          {asistioEseDia ? "✅" : "❗"}
                                        </button>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

          {mostrarModalAgregarMaestro && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all">
                <h3 className="text-xl font-extrabold text-gray-800 mb-4 text-center">
                  Agregar Maestro Manual
                </h3>
                <form
                  onSubmit={agregarMaestroManualEvento}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      No. Empleado
                    </label>
                    <input
                      type="text"
                      value={formNuevoMaestro.id}
                      onChange={(e) =>
                        setFormNuevoMaestro({
                          ...formNuevoMaestro,
                          id: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
                      placeholder="Ej. 123456"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={formNuevoMaestro.nombreCompleto}
                      onChange={(e) =>
                        setFormNuevoMaestro({
                          ...formNuevoMaestro,
                          nombreCompleto: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
                      placeholder="Nombre del docente"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setMostrarModalAgregarMaestro(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cargando}
                      className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors"
                    >
                      {cargando ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {pantallaActual === "admin_maestros" && esAdmin && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Base de Datos General
                </h2>

                {modoEdicion ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={cancelarEdicion}
                      disabled={cargando}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardarCambios}
                      disabled={cargando}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center"
                    >
                      {cargando ? "Guardando..." : "💾 Guardar Todo"}
                    </button>
                  </div>
                ) : modoSeleccionDescarga ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setModoSeleccionDescarga(false);
                        setMaestrosSeleccionados([]);
                      }}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={exportarSeleccion}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-orange-600 flex items-center gap-2"
                    >
                      📥 Descargar Selección ({maestrosSeleccionados.length})
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-3 relative">
                    <div>
                      <button
                        onClick={() =>
                          setMenuDescargaGeneralAbierto(
                            !menuDescargaGeneralAbierto,
                          )
                        }
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 flex items-center gap-2"
                      >
                        📥 Descargar Excel ▼
                      </button>
                      {menuDescargaGeneralAbierto && (
                        <div className="absolute right-[130px] mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-50">
                          <button
                            onClick={() => {
                              exportarDirectorio();
                              setMenuDescargaGeneralAbierto(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm font-bold text-gray-700 border-b border-gray-100"
                          >
                            📄 Descargar Toda la Lista
                          </button>
                          <button
                            onClick={() => {
                              setModoSeleccionDescarga(true);
                              setMenuDescargaGeneralAbierto(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm font-bold text-orange-600"
                          >
                            ☑️ Seleccionar y Descargar
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={iniciarEdicion}
                      className={`${themeBg} text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 flex items-center gap-2`}
                    >
                      ✏️ Editar Tabla
                    </button>
                  </div>
                )}
              </div>

              {/* NUEVO: BARRA DE BÚSQUEDA GENERAL */}
              <input
                type="text"
                value={busquedaMaestros}
                onChange={(e) => setBusquedaMaestros(e.target.value)}
                placeholder="🔍 Buscar por nombre o número de empleado..."
                className="w-full mb-4 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-400 outline-none"
              />

              <div
                className={`bg-white rounded-xl shadow-sm border flex-1 flex flex-col ${modoEdicion ? "border-sky-300 ring-2 ring-sky-100" : "border-gray-200"}`}
              >
                {/* BOTÓN MOVIDO A LA PARTE SUPERIOR */}
                {modoEdicion && (
                  <div className="p-4 border-b border-gray-100 bg-sky-50/30 flex justify-start">
                    <button
                      onClick={agregarFila}
                      className="text-sky-600 font-bold text-sm bg-sky-100 hover:bg-sky-200 px-5 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                    >
                      ➕ Agregar Maestro
                    </button>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {modoSeleccionDescarga && (
                          <th className="p-4 text-sm font-bold text-orange-500 text-center w-16">
                            ☑️
                          </th>
                        )}
                        <th className="p-4 text-sm font-bold text-gray-600 w-1/4">
                          TRAYECTORIA
                        </th>
                        <th className="p-4 text-sm font-bold text-gray-600 w-1/4">
                          NO. EMPLEADO
                        </th>
                        <th className="p-4 text-sm font-bold text-gray-600 w-2/4">
                          NOMBRE DEL DOCENTE
                        </th>
                        {modoEdicion && (
                          <th className="p-4 text-sm font-bold text-red-500 text-center">
                            ELIMINAR
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {!modoEdicion &&
                        maestrosFiltradosGeneral.map((maestro) => (
                          <tr
                            key={maestro.id}
                            className={`transition-colors ${maestrosSeleccionados.includes(maestro.id) ? "bg-orange-50" : "hover:bg-gray-50"}`}
                          >
                            {modoSeleccionDescarga && (
                              <td className="p-4 text-center">
                                <input
                                  type="checkbox"
                                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                                  checked={maestrosSeleccionados.includes(
                                    maestro.id,
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked)
                                      setMaestrosSeleccionados([
                                        ...maestrosSeleccionados,
                                        maestro.id,
                                      ]);
                                    else
                                      setMaestrosSeleccionados(
                                        maestrosSeleccionados.filter(
                                          (id) => id !== maestro.id,
                                        ),
                                      );
                                  }}
                                />
                              </td>
                            )}
                            <td className="p-4 text-sm text-gray-500">
                              {maestro.trayectoria || "-"}
                            </td>
                            <td className="p-4 text-sm font-semibold text-gray-700">
                              {maestro.id}
                            </td>
                            <td className="p-4 text-sm text-gray-800 font-medium">
                              {maestro.nombreCompleto}
                            </td>
                          </tr>
                        ))}

                      {modoEdicion &&
                        cambiosDirectorio.map((maestro, index) => {
                          const textoBusqueda = busquedaMaestros.toLowerCase();
                          const nombre = maestro.nombreCompleto
                            ? maestro.nombreCompleto.toLowerCase()
                            : "";
                          const idMaestro = maestro.id
                            ? String(maestro.id).toLowerCase()
                            : "";

                          if (
                            busquedaMaestros &&
                            !nombre.includes(textoBusqueda) &&
                            !idMaestro.includes(textoBusqueda)
                          ) {
                            return null;
                          }

                          return (
                            <tr
                              key={index}
                              className={`transition-all duration-500 ${filaNuevaIndex === index ? "bg-orange-50 border-2 border-orange-400 ring-4 ring-orange-200 animate-pulse shadow-lg scale-[1.01]" : "bg-sky-50/30"}`}
                            >
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={maestro.trayectoria}
                                  onChange={(e) =>
                                    handleCambioInput(
                                      index,
                                      "trayectoria",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full p-2 border border-sky-200 rounded outline-none focus:border-sky-400 text-sm"
                                  placeholder="Ej. 10 años"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={maestro.id}
                                  onChange={(e) =>
                                    handleCambioInput(
                                      index,
                                      "id",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full p-2 border border-sky-200 rounded outline-none focus:border-sky-400 text-sm font-semibold"
                                  placeholder="No. Empleado"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={maestro.nombreCompleto}
                                  onChange={(e) =>
                                    handleCambioInput(
                                      index,
                                      "nombreCompleto",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full p-2 border border-sky-200 rounded outline-none focus:border-sky-400 text-sm"
                                  placeholder="Nombre completo"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => eliminarFila(index)}
                                  className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg cursor-pointer"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {pantallaActual === "registrar_evento" && esAdmin && (
            <div className="max-w-2xl mx-auto w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                  {editandoEventoId ? "Editar Evento" : "Crear Nuevo Evento"}
                </h2>
                <button
                  onClick={() =>
                    navegarA(
                      formEvento.tipo === "interno"
                        ? "admin_eventos_internos"
                        : "admin_eventos",
                    )
                  }
                  className="text-gray-500 hover:text-gray-800 text-sm font-bold"
                >
                  &larr; Cancelar
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                <form onSubmit={guardarEvento} className="space-y-5">
                  {/* SELECTOR DE DURACIÓN (CON BRILLO AL CLONAR) */}
                  {formEvento.tipo === "interno" && (
                    <div
                      className={`p-4 rounded-xl border transition-all mb-2 ${resaltarFechas ? "bg-orange-50 border-orange-400 ring-4 ring-orange-400 animate-pulse shadow-lg" : "bg-sky-50 border-sky-100"}`}
                    >
                      <label className="block text-sm font-bold text-gray-700 mb-3 text-center">
                        ¿Cuál es la duración de esta reunión?
                      </label>
                      <div className="flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setFormEvento({
                              ...formEvento,
                              esMultiDia: false,
                              fechaFin: "",
                              horaFin: "",
                            })
                          }
                          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${!formEvento.esMultiDia ? "bg-sky-600 text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}
                        >
                          📅 Único Día
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormEvento({ ...formEvento, esMultiDia: true })
                          }
                          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${formEvento.esMultiDia ? "bg-sky-600 text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}
                        >
                          🗓️ Varios Días
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Título del Evento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formEvento.titulo}
                      onChange={(e) =>
                        setFormEvento({ ...formEvento, titulo: e.target.value })
                      }
                      placeholder="Ej. Junta de Academia"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                      required
                    />
                  </div>

                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl transition-all ${resaltarFechas ? "bg-orange-50 border-2 border-orange-400 ring-4 ring-orange-400 animate-pulse shadow-lg" : ""}`}
                  >
                    {/* FECHA INICIO */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        {formEvento.esMultiDia
                          ? "Fecha Inicio"
                          : "Fecha del Evento"}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formEvento.fecha}
                        onChange={(e) =>
                          setFormEvento({
                            ...formEvento,
                            fecha: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                        required
                      />
                    </div>

                    {/* FECHA FIN */}
                    {formEvento.esMultiDia && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Fecha Fin <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formEvento.fechaFin}
                          onChange={(e) =>
                            setFormEvento({
                              ...formEvento,
                              fechaFin: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                          required={formEvento.esMultiDia}
                        />
                      </div>
                    )}

                    {/* HORA INICIO */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Hora de Inicio <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={formEvento.hora}
                        onChange={(e) =>
                          setFormEvento({ ...formEvento, hora: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                        required
                      />
                    </div>

                    {/* HORA FIN */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Hora de Fin{" "}
                        <span className="text-gray-400 font-normal">
                          (Opcional - RECOMENDADO)
                        </span>
                      </label>
                      <input
                        type="time"
                        value={formEvento.horaFin}
                        onChange={(e) =>
                          setFormEvento({
                            ...formEvento,
                            horaFin: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Descripción Corta <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formEvento.descripcion}
                      onChange={(e) =>
                        setFormEvento({
                          ...formEvento,
                          descripcion: e.target.value,
                        })
                      }
                      rows="2"
                      placeholder="Breve detalle del evento..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm shadow-sm transition-all"
                    >
                      Guardar Evento
                    </button>
                  </div>
                </form>

                {/* POPUP ANIMADO DE ERROR DE FECHA */}
                {mostrarPopupErrorFecha && (
                  <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border-t-4 border-red-500 transform scale-100 transition-all">
                      <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4 shadow-inner">
                        <span className="text-3xl">⏳</span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        ¡Oops! Ese día ya pasó
                      </h3>
                      <p className="text-sm text-gray-600 mb-6 font-medium">
                        No puedes registrar un evento en el pasado. Por favor
                        selecciona una fecha y horario en el futuro para
                        continuar.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMostrarPopupErrorFecha(false)}
                        className="w-full inline-flex justify-center rounded-xl border border-transparent bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 shadow-md transition-colors"
                      >
                        Entendido, cambiaré la fecha
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!esAdmin && pantallaActual === "eventos" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Próximos Eventos
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Selecciona un evento para registrar tu pre-asistencia o ver
                  los detalles.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Juntamos ambas listas en una sola antes de filtrarlas */}
                {[...listaEventos, ...listaEventosInternos]
                  .filter((evento) => !esEventoCaducado(evento))
                  /* --- EL CANDADO MÁGICO DE SEGURIDAD --- */
                  .filter((evento) => {
                    // 1. Si el evento es público, pasa directo sin pedir credencial
                    if (evento.tipo !== "interno") return true;

                    // 2. Si es interno, revisamos si el ID del evento está en su cartera de invitaciones
                    return misInvitaciones.includes(evento.id);
                  })
                  /* -------------------------------------- */
                  .map((evento) => (
                    <div
                      key={evento.id}
                      className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col border border-gray-100 transition-transform hover:-translate-y-1"
                    >
                      <div className="h-40 bg-gray-200 relative overflow-hidden">
                        <img
                          src={evento.portada}
                          alt={evento.titulo}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          {evento.tipo === "interno" && (
                            <span
                              className={`${colorAdminGlobal} text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1`}
                            >
                              🔒 INTERNO
                            </span>
                          )}
                          <h3 className="text-lg font-bold text-gray-800">
                            {evento.titulo}
                          </h3>
                          <p className="text-gray-500 text-xs mt-1">
                            📅 {evento.fecha}{" "}
                            {evento.esMultiDia && evento.fechaFin
                              ? `al ${evento.fechaFin}`
                              : ""}{" "}
                            • {evento.hora || "Por definir"}{" "}
                            {evento.horaFin ? `- ${evento.horaFin}` : ""}
                          </p>
                          <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                            {evento.descripcion}
                          </p>
                        </div>
                        <div className="mt-5 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => abrirDetalleEventoUsuario(evento)}
                            className={`w-full text-white py-2.5 rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-all ${evento.tipo === "interno" ? `${colorAdminGlobal} ${themeHover} shadow-sm` : `${themeBg} ${themeHover} shadow-md`}`}
                          >
                            👁️ Ver Detalles
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {!esAdmin && pantallaActual === "mis_eventos" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Mis Registros
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Tu agenda personal. Eventos a los que estás pre-registrado o
                  invitado oficialmente.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...listaEventos, ...listaEventosInternos]
                  /* MAGIA: Solo eventos vigentes donde su ID esté en tu cartera */
                  .filter(
                    (evento) =>
                      misInvitaciones.includes(evento.id) &&
                      !esEventoCaducado(evento),
                  )
                  .map((evento) => (
                    <div
                      key={evento.id}
                      className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col border border-gray-100 transition-transform hover:-translate-y-1"
                    >
                      <div className="h-40 bg-gray-200 relative overflow-hidden">
                        <img
                          src={evento.portada}
                          alt={evento.titulo}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          {evento.tipo === "interno" && (
                            <span className={`${colorAdminGlobal} text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1`}>
                              🔒 INTERNO
                            </span>
                          )}
                          <h3 className="text-lg font-bold text-gray-800">
                            {evento.titulo}
                          </h3>
                          <p className="text-gray-500 text-xs mt-1">
                            📅 {evento.fecha} • {evento.hora || "Por definir"}
                          </p>
                        </div>
                        <div className="mt-5 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => abrirDetalleEventoUsuario(evento)}
                            className={`w-full text-white py-2.5 rounded-lg font-bold transition-all text-sm flex justify-center items-center gap-2 ${evento.tipo === "interno" ? `${colorAdminGlobal} ${themeHover}` : `${themeBg} ${themeHover}`}`}
                          >
                            👁️ Ver Detalles
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {pantallaActual === "eventos_recientes" && (
            <div>
              {/* EL MENSAJE ROJO SOLO LO VE EL ADMIN */}
              {esAdmin && (
                <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm">
                  <h2 className="text-red-700 font-bold text-lg mb-1 flex items-center gap-2">
                    ⚠️ Limpieza Automática
                  </h2>
                  <p className="text-red-600 text-sm font-medium">
                    Estos eventos han finalizado. Se borrarán de forma
                    permanente y automática de la base de datos dentro de 7 días
                    a partir de su cierre.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...listaEventos, ...listaEventosInternos]
                  .filter((ev) => esEventoCaducado(ev))
                  .filter(
                    (ev) =>
                      esAdmin ||
                      ev.tipo !== "interno" ||
                      misInvitaciones.includes(ev.id),
                  )
                  .map((evento) => {
                    const diasRestantes = diasParaEliminacion(evento);
                    return (
                      <div
                        key={evento.id}
                        className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col border border-gray-100 opacity-90 hover:opacity-100 transition-opacity"
                      >
                        <div className="bg-red-600 text-white text-xs font-bold text-center py-2 shadow-inner tracking-wide">
                          🔴 TERMINÓ EL{" "}
                          {evento.esMultiDia && evento.fechaFin
                            ? evento.fechaFin.toUpperCase()
                            : evento.fecha.toUpperCase()}
                        </div>
                        <div className="h-40 bg-gray-200 relative overflow-hidden grayscale-[30%]">
                          <img
                            src={evento.portada}
                            alt={evento.titulo}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">
                              {evento.titulo}
                            </h3>
                            <p className="text-gray-500 text-xs mt-1">
                              📅 {evento.fecha} • {evento.hora || "Por definir"}
                            </p>
                            <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                              {evento.descripcion}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-100">
                            {/* AQUÍ SEPARRAMOS QUÉ VE EL ADMIN Y QUÉ VE EL MAESTRO */}
                            {esAdmin ? (
                              <>
                                <p className="text-center text-red-500 text-xs font-bold mb-3 animate-pulse">
                                  ⏳ Se elimina en {diasRestantes} día
                                  {diasRestantes !== 1 ? "s" : ""}
                                </p>
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => {
                                      setEventoSeleccionado(evento);
                                      navegarA("detalle_evento");
                                    }}
                                    className="w-full bg-gray-800 text-white py-2.5 rounded-lg font-bold hover:bg-black transition-all text-sm flex justify-center items-center gap-2"
                                  >
                                    👁️ Ver Archivo Histórico
                                  </button>
                                  <button
                                    onClick={() =>
                                      prepararReutilizacionEvento(evento)
                                    }
                                    className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-all text-sm flex justify-center items-center gap-2 shadow-sm"
                                  >
                                    🔄 Volver a cargar evento
                                  </button>
                                </div>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEventoSeleccionado(evento);
                                  navegarA("detalle_evento");
                                }}
                                className="w-full bg-fime-main text-white py-2.5 rounded-lg font-bold hover:bg-fime-dark transition-all text-sm flex justify-center items-center gap-2"
                              >
                                👁️ Ver Detalles
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {pantallaActual === "detalle_evento" && eventoSeleccionado && (
            <div className="max-w-3xl mx-auto w-full relative">
              <button
                onClick={() =>
                  navegarA(
                    esEventoCaducado(eventoSeleccionado)
                      ? "eventos_recientes"
                      : esAdmin
                        ? "admin_eventos"
                        : "eventos",
                  )
                }
                className="text-gray-500 hover:text-gray-800 text-sm font-bold mb-4 flex items-center transition-colors"
              >
                &larr; Regresar
              </button>
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="h-64 bg-gray-200 relative overflow-hidden">
                  <img
                    src={eventoSeleccionado.portada}
                    alt={eventoSeleccionado.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                    {eventoSeleccionado.titulo}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6 font-medium">
                    <span className="flex items-center bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                      📅 {eventoSeleccionado.fecha}
                    </span>
                    <span className="flex items-center bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                      ⏰ {eventoSeleccionado.hora || "Por definir"}
                    </span>
                  </div>
                  <div className="text-gray-600 mb-8 whitespace-pre-wrap leading-relaxed">
                    {eventoSeleccionado.descripcion ||
                      "Sin descripción detallada."}
                  </div>

                  {/* === LÓGICA MÁGICA DE BOTONES (HISTÓRICO VS ACTIVO) === */}
                  <div className="flex flex-col sm:flex-row gap-4 border-t border-gray-100 pt-6">
                    {esEventoCaducado(eventoSeleccionado) ? (
                      // MODO HISTÓRICO (EL EVENTO YA PASÓ)
                      esAdmin ? (
                        <>
                          <button
                            onClick={() =>
                              abrirAsistenciasAdmin(eventoSeleccionado)
                            }
                            className="flex-1 bg-sky-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-sky-700 transition-all flex justify-center items-center gap-2"
                          >
                            👁️ Ver Lista de Maestros
                          </button>
                          <button
                            onClick={() =>
                              descargarHistoricoAdmin(eventoSeleccionado)
                            }
                            disabled={cargando}
                            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-green-700 transition-all flex justify-center items-center gap-2"
                          >
                            {cargando ? "Descargando..." : "📥 Descargar Excel"}
                          </button>
                        </>
                      ) : (
                        <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-lg font-bold flex justify-center items-center cursor-not-allowed text-center">
                          🔒 Archivo Histórico: Este evento ha finalizado
                        </div>
                      )
                    ) : (
                      // MODO ACTIVO (SOLO MORTALES LLEGAN AQUÍ)
                      !esAdmin &&
                      (eventoSeleccionado.tipo === "interno" ? (
                        <BannerAsistenciaDinamico
                          evento={eventoSeleccionado}
                          numEmpleado={numEmpleado}
                        />
                      ) : (
                        <button
                          onClick={registrarPreAsistencia}
                          disabled={cargando || yaRegistrado}
                          className={`w-full text-white py-3 px-4 rounded-lg font-bold transition-all flex justify-center items-center gap-2 ${yaRegistrado ? "bg-gray-400 cursor-not-allowed" : eventoSeleccionado.tipo === "interno" ? "bg-fime-main hover:bg-fime-dark shadow-md" : `${themeBg} hover:opacity-90 shadow-md`}`}
                        >
                          {cargando
                            ? "Procesando..."
                            : yaRegistrado
                              ? "✅ Ya estás registrado"
                              : "✅ Pre-asistencia"}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* MODAL DE ÉXITO DE PRE-ASISTENCIA */}
              {mostrarPopup && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all animate-bounce-short">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner border-4 border-white">
                      <span className="text-4xl">🎉</span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-800 mb-2">
                      ¡Pre-asistencia enviada!
                    </h3>
                    <p className="text-gray-600 mb-6 font-medium leading-relaxed">
                      Tu registro para{" "}
                      <strong className="text-gray-800">
                        {eventoSeleccionado.titulo}
                      </strong>{" "}
                      ha sido confirmado exitosamente.
                    </p>
                    <button
                      onClick={() => {
                        setMostrarPopup(false);
                        navegarA("eventos");
                      }}
                      className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                    >
                      Entendido
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ==============================================================
// EL VERDADERO CANDADO ANTI-CLONES (NIVEL DIOS)
// Se ejecuta ANTES de que React despierte. Si es clon, lo mata aquí mismo.
// ==============================================================
if (!window.name) {
  // Le ponemos una placa de identidad a la pestaña original
  window.name = "FimeTab_" + Date.now();

  // Si la pestaña NO tenía placa, pero SÍ tiene memoria guardada, es un clon (Chrome copió la memoria).
  if (sessionStorage.getItem("pantallaFime")) {
    sessionStorage.clear(); // Le borramos la memoria robada
    window.location.replace(window.location.pathname); // Lo regresamos al login sin dejar historial
  }
}

// Ya que pasamos la seguridad, encendemos React
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
