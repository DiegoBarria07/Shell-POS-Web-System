# Shell POS - Sistema de Gestión y Cuadratura de Caja

## Descripción del Proyecto
Este proyecto es una aplicación web (Single Page Application - SPA) diseñada para optimizar, asegurar y automatizar el proceso de cierre de caja en estaciones de servicio. El sistema resuelve la pérdida de tiempo y reduce a cero los errores humanos al realizar el conteo manual de dinero, calculando de forma exacta los descuadres financieros entre el efectivo físico, tarjetas, transferencias y aplicaciones.

## Mi Rol y Enfoque de Desarrollo
Para la construcción de este software, asumí el rol de **Analista de Negocio y Arquitecto Lógico**:
* **Levantamiento de requerimientos:** Diseño del flujo de usuario real adaptado a las necesidades operativas de una estación de servicio.
* **Diseño UI/UX:** Conceptualización de una interfaz responsiva, accesible (navegación por teclado) y adaptable a entornos con poca luz (Modo Oscuro).
* **Seguridad y Reglas de Negocio:** Implementación de algoritmos de validación estricta, como la verificación matemática del RUT chileno para la eliminación de usuarios, y flujos de protección de datos.
* **Desarrollo asistido:** Utilización de Inteligencia Artificial como herramienta de programación pura, guiando la generación de código mediante especificaciones técnicas exactas (*Prompt Engineering*).

## Características Principales
* **Single Page Application (SPA):** Navegación fluida y reactiva sin recarga de página.
* **Cálculo Reactivo en Tiempo Real:** Los resultados de la cuadratura y los totales de billetes se actualizan instantáneamente mediante eventos del teclado sin requerir el uso del mouse.
* **Persistencia de Datos (Local Storage):** Toda la información de depósitos, historiales y base de datos de trabajadores se almacena de forma local en el navegador, evitando la pérdida de datos ante cierres accidentales.
* **Panel de Administración Seguro:** Acceso restringido para la gestión de personal (Agregar/Eliminar) y auditoría de historiales mediante filtros combinados (Trabajador/Fecha).
* **Accesibilidad y Soporte Multi-dispositivo:** Interfaz 100% responsiva (CSS Grid y Flexbox) adaptada a cualquier monitor o dispositivo móvil.
* **Diseño Adaptativo (Dark/Light Mode):** Paleta de colores corporativa suavizada para evitar la fatiga visual de los trabajadores en turnos nocturnos, intercambiable dinámicamente.

## Tecnologías Utilizadas
* **HTML5:** Estructura semántica.
* **CSS3:** Variables globales, flexbox, grid, animaciones clave e iconografía vectorial nativa (SVG).
* **JavaScript (Vanilla):** Manipulación del DOM, lógica matemática, validación de RUT (Módulo 11) y gestión de `localStorage`.

## Instalación y Ejecución
Dado que el proyecto está desarrollado con tecnologías web nativas (Vanilla), no requiere instalación de dependencias ni servidores complejos.

1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/tu-usuario/Shell-POS-Web-System.git](https://github.com/tu-usuario/Shell-POS-Web-System.git)
