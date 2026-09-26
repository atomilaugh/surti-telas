import React, { useState, useEffect, ReactNode } from 'react';
import {
  Shirt,
  Scissors,
  Layers,
  Truck,
  Warehouse,
  ArrowRight,
  Zap,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  CheckCircle2,
  Package,
  PackageCheck,
  Palette,
  Layout,
  MousePointer,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { appContent } from '@/shared/config/appContent';

/* =========================
   TYPES
========================= */

interface ChallengeItem {
  id: string;
  icon: ReactNode;
  bg: string;
  title: string;
  desc: string;
}

interface SlideItem {
  id: string;
  title: string;
  phrase: string;
  img: string;
  tag: string;
}

interface FeatureItem {
  id: string;
  icon: ReactNode;
  title: string;
  desc: string;
}

interface TrackingStep {
  id: number;
  label: string;
  icon: ReactNode;
  status: 'completed' | 'current' | 'upcoming';
}

/* =========================
   DATA
========================= */

const challenges: ChallengeItem[] = appContent.home.challenges.map((item) => ({
  id: item.id,
  icon: <AlertCircle size={24} color="#E53E3E" />,
  bg: '#FFF5F5',
  title: item.title,
  desc: item.desc,
}));

const slides: SlideItem[] = appContent.home.slides.map((slide, index) => ({
  id: slide.id,
  title: slide.title,
  phrase: slide.phrase,
  img: ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=800', 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800'][index] ?? 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=800',
  tag: slide.tag,
}));

const features: FeatureItem[] = appContent.home.features.map((feature, index) => ({
  id: feature.id,
  icon: [<Layout size={20} />, <Zap size={20} />, <MousePointer size={20} />][index] ?? <Smartphone size={20} />,
  title: feature.title,
  desc: feature.desc,
}));

const trackingSteps: TrackingStep[] = appContent.home.trackingSteps.map((step, index) => ({
  id: step.id,
  label: step.label,
  icon: [<CheckCircle2 size={22} />, <Package size={22} />, <Truck size={22} />, <PackageCheck size={22} />][index] ?? <CheckCircle2 size={22} />,
  status: index < 3 ? 'completed' : 'upcoming',
}));

/* =========================
   COMPONENTS
========================= */

const ChallengesSection = () => (
  <section className="challenges-section" id="nosotros">
    <div className="section-header">
      <span className="badge-alert">Problemas comunes</span>
      <h2>¿Te suena familiar?</h2>
      <p>La mayor parte de empresas de confección enfrentan estos desafíos diariamente.</p>
    </div>

    <div className="challenges-grid">
      {challenges.map((item) => (
        <div className="challenge-card" key={item.id}>
          <div className="icon-box" style={{ backgroundColor: item.bg }}>
            {item.icon}
          </div>
          <h3>{item.title}</h3>
          <p>{item.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

const ProductCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  // Auto-play del carrusel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  const handleSlide = (direction: 'next' | 'prev') => {
    setCurrentSlide((prev) => {
      if (direction === 'next') {
        return prev === slides.length - 1 ? 0 : prev + 1;
      }
      return prev === 0 ? slides.length - 1 : prev - 1;
    });
  };

  return (
    <section className="carousel-section" id="catalogo">
      <div className="carousel-header">
        <span className="badge">Excelencia Textil</span>
        <h2>Inspirando confianza en cada prenda</h2>
      </div>

      <div className="carousel-container-wrapper">
        <button className="nav-btn prev" onClick={() => handleSlide('prev')} aria-label="Anterior">
          <ChevronLeft />
        </button>

        <button className="nav-btn next" onClick={() => handleSlide('next')} aria-label="Siguiente">
          <ChevronRight />
        </button>

        <div className="carousel-window">
          <div
            className="carousel-track"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((slide) => (
              <div className="slide-card-full" key={slide.id}>
                <div className="slide-image">
                  <img src={slide.img} alt={slide.title} loading="lazy" />
                  <span className="slide-tag">{slide.tag}</span>
                </div>

                <div className="slide-info">
                  <h3>{slide.title}</h3>
                  <p>{slide.phrase}</p>
                  <button className="btn-primary" onClick={() => navigate('/catalogo')}>
                    Explorar calidad
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// NUEVA SECCIÓN: Cuadrícula de Categorías (Inspirada en image_b1f9cf.jpg)
const CategoriesGridSection = () => {
  const navigate = useNavigate();

  return (
    <section className="categories-showcase-section">
      <div className="categories-main-grid">
        
        {/* Tarjeta Destacada de la Izquierda - Gorras */}
        <div className="main-featured-card">
          <div className="featured-card-image-wrapper">
            <img 
              src="https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600" 
              alt="Gorras de marca" 
              loading="lazy"
            />
            <div className="featured-card-overlay">
              <div className="featured-card-content">
                <h2>GORRAS DE MARCA PERSONALIZACIÓN TOTAL</h2>
                <button className="btn-white-action" onClick={() => navigate('/catalogo')}>
                  Ver Catálogo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bloque de la Derecha - Cuadrícula Modular */}
        <div className="side-modular-block">
          <div className="sub-categories-grid">
            
            {/* Fila Superior: Diseños Exclusivos y Camisetas Premium */}
            <div className="category-landscape-card">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTjh0DB7id5MgGdEvh4Cxk3ihwmaA8IJXz_A&s" alt="Diseños Exclusivos" />
              <div className="landscape-card-overlay">
                <h3>DISEÑOS EXCLUSIVOS</h3>
              </div>
            </div>

            <div className="category-landscape-card">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpCVhDwURSGK4uWS56JC-S2-TegnZbAYgwSg&s" alt="Camisetas Premium" />
              <div className="landscape-card-overlay">
                <h3>CAMISETAS PREMIUM</h3>
              </div>
            </div>

            {/* Fila Inferior: Pantalonetas y Camisas de Marca */}
            <div className="product-minimal-card">
              <div className="minimal-card-image">
                <img src="https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=400" alt="Pantalonetas" />
              </div>
              <div className="minimal-card-info">
                <span className="category-tag">Pantalonetas</span>
              </div>
            </div>

            <div className="product-minimal-card">
              <div className="minimal-card-image">
                <img src="https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=400" alt="Camisas de Marca" />
              </div>
              <div className="minimal-card-info">
                <span className="category-tag">Camisas de Marca</span>
              </div>
            </div>

          </div>

          {/* Banner Horizontal Inferior - Diseño de Marcas */}
          <div className="brand-design-banner">
            <div className="banner-left-side">
              <div className="palette-icon-container">
                <Palette size={24} className="icon-dark" />
              </div>
              <div className="banner-text-details">
                <h4>DISEÑO DE MARCAS</h4>
                <p>Diseños únicos sin costo adicional</p>
              </div>
            </div>
            <button className="btn-black-pill" onClick={() => navigate('/contacto')}>
              Ver más
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};

const OrderTrackingSection = () => (
  <section className="tracking-section">
    <div className="tracking-header">
      <span className="badge-blue">Seguimiento en tiempo real</span>
      <h2>Rastrea tu pedido en cada paso</h2>
      <p>Transparencia total desde que realizas tu compra hasta que llega a tu puerta</p>
    </div>

    <div className="tracking-container-box">
      <div className="tracking-timeline">
        <div className="timeline-progress-bar">
          <div className="timeline-progress-fill" style={{ width: '70%' }} />
        </div>

        <div className="timeline-steps">
          {trackingSteps.map((step) => (
            <div key={step.id} className={`timeline-step-item ${step.status}`}>
              <div className="step-icon-circle">
                {step.icon}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const MobileExperience = () => (
  <section className="mobile-section" id="contacto">
    <div className="mobile-container">
      <div className="mobile-text">
        <span className="badge-dark">Experiencia móvil</span>
        <h2>Compra desde cualquier lugar</h2>
        <p>
          Aplicación optimizada para móviles. Tus clientes pueden navegar, comprar y hacer
          seguimiento desde su celular.
        </p>

        <div className="mobile-features-list">
          {features.map((feature) => (
            <div className="m-feature-item" key={feature.id}>
              <div className="m-icon-box">{feature.icon}</div>
              <div className="m-info">
                <h4>{feature.title}</h4>
                <p>{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mobile-visuals">
        {[
          {
            id: 'img-1',
            className: 'p-1',
            src: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=500',
            alt: 'Ropa 1'
          },
          {
            id: 'img-2',
            className: 'p-2',
            src: 'https://images.unsplash.com/photo-1554568218-0f1715e72254?q=80&w=500',
            alt: 'Ropa 2'
          }
        ].map((image) => (
          <div key={image.id} className={`phone-card ${image.className}`}>
            <img src={image.src} alt={image.alt} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* =========================
   PAGE
========================= */

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <main>
        <section className="hero-container" id="inicio">
          <div className="hero-content">
            <div className="hero-text">
              <span className="badge">Líderes en confección</span>
              <h1>Bienvenido a Surti<span className="brand-dash">-Camisetas</span></h1>
              <p>
                Más de 15 años liderando la industria textil. Productos premium en algodón 100% y
                personalización avanzada para tu marca o evento.
              </p>

              <div className="hero-btns">
                <button className="btn-primary btn-large" onClick={() => navigate('/catalogo')}>
                  Ver catálogo
                  <ArrowRight size={18} />
                </button>
                <button className="btn-secondary btn-large" onClick={() => navigate('/login')}>
                  Iniciar sesión
                </button>
              </div>


            </div>

            <div className="hero-visual">
              <div className="window-mockup">
                <div className="window-header">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>

                <div className="window-grid">
                  <div className="grid-card">
                    <Shirt size={32} strokeWidth={1.2} />
                  </div>
                  <div className="grid-card">
                    <Scissors size={32} strokeWidth={1.2} />
                  </div>
                  <div className="grid-card">
                    <Layers size={32} strokeWidth={1.2} />
                  </div>
                  <div className="grid-card">
                    <Warehouse size={32} strokeWidth={1.2} />
                  </div>
                  <div className="grid-card">
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/2503/2503380.png"
                      alt="Icono textil"
                      className="small-img"
                    />
                  </div>
                  <div className="grid-card">
                    <Truck size={32} strokeWidth={1.2} />
                  </div>
                </div>

                <div className="phone-mockup">
                  <div className="phone-inner">
                    <div className="phone-skeleton-line" />
                    <div className="phone-skeleton-rect" />
                  </div>
                </div>
              </div>
        </div>
      </div>
    </section>

    <ChallengesSection />
    <ProductCarousel />
    
    <CategoriesGridSection />

    <OrderTrackingSection />
    
    <MobileExperience />
      </main>
    </div>
  );
};

export default HomePage;