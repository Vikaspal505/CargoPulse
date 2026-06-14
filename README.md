# CargoPulse

An autonomous freight-matching platform that turns empty truck returns into revenue by pairing them with nearby pending shipments. CargoPulse uses real road-network routing, predictive capacity forecasting, and an AI coordinator that scores, explains, and commits matches in real time.

## 🚀 Features

- **Real-Time Freight Matching**: Automatically matches empty trucks with pending shipments based on proximity, capacity, and profitability.
- **Interactive Live Dashboard**: A crisp, modern light-themed dashboard providing real-time visibility into the logistics network.
- **Live Map Visualization**: Interactive map powered by Leaflet and CartoDB, showing live truck locations, available shipments, and optimized routing.
- **Predictive ML Insights**: Advanced forecasting for capacity crunches and expected freight demand over 24-72 hours.
- **Event-Driven Architecture**: Designed to handle high-throughput telematics data streams, ensuring matches are evaluated and executed synchronously.

## 🛠️ Technology Stack

- **Frontend Framework**: [React](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Routing**: [@tanstack/react-router](https://tanstack.com/router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Mapping**: [react-leaflet](https://react-leaflet.js.org/) & CartoDB tile layers
- **Icons & Components**: Custom glassmorphism-inspired UI elements with standard web components
- **Package Manager**: [Bun](https://bun.sh/)

## 🏃‍♂️ Getting Started

### Prerequisites

Ensure you have [Bun](https://bun.sh/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Vikaspal505/CargoPulse.git
   cd CargoPulse
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

### Running Locally

Start the development server:

```bash
bun run dev
```

Navigate to `http://localhost:5173` to view the application.

## 🏗️ Architecture

CargoPulse runs on an event-driven pipeline that scales to support high volumes of real-time logistics data. For a deep dive into the system's architecture, including the predictive ML and matching engine flows, visit the `/architecture` route within the live application.

## 📄 License

This project is open-source and available under the standard MIT License.
