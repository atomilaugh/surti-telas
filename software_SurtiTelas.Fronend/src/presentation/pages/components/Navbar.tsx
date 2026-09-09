import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import logoImg from "@assets/images/logos/surtitelas-logo.jpg";
import { useCart, useAuth } from "@/app/providers/AppProviders";
import { Tooltip } from "@/shared/components/Tooltip";
import "./Navbar.css";

const USER_TOOLTIP: Record<string, string> = {
  admin: "Panel Admin",
  asesor: "Panel Asesor",
  domiciliario: "Panel Domiciliario",
  cliente: "Mi Cuenta",
};

const CLIENTE_HINT_STORAGE_KEY = "cliente_profile_hint_seen";

const readClienteHintSeen = (): boolean => {
  try {
    return window.localStorage.getItem(CLIENTE_HINT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeClienteHintSeen = (): void => {
  try {
    window.localStorage.setItem(CLIENTE_HINT_STORAGE_KEY, "1");
  } catch {
    /* almacenamiento no disponible: ignorar */
  }
};

const Navbar: React.FC = () => {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Estado para detectar si el usuario ha hecho scroll hacia abajo
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const role = user?.role;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showClienteHint, setShowClienteHint] = useState(false);

  useEffect(() => {
    setShowClienteHint(role === "cliente" && !readClienteHintSeen());
  }, [role]);

  const goToCart = () => navigate("/carrito");
  const goToLogin = () => navigate("/login");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  const handleUserClick = () => {
    if (!user) {
      goToLogin();
      return;
    }

    if (role === "cliente" && showClienteHint) {
      writeClienteHintSeen();
      setShowClienteHint(false);
    }

    switch (role) {
      case "admin":
        navigate("/admin/dashboard");
        break;
      case "asesor":
        navigate("/asesor/dashboard");
        break;
      case "domiciliario":
        navigate("/domiciliario/dashboard");
        break;
      case "cliente":
        navigate("/cliente/inicio");
        break;
      default:
        navigate("/perfil");
    }
  };

  const userTooltipTitle =
    role === "cliente"
      ? "Mi cuenta · Ver mi perfil y pedidos"
      : role
        ? USER_TOOLTIP[role] ?? "Mi Cuenta"
        : "Iniciar sesión";

  return (
    /* Agregamos dinámicamente la clase 'is-scrolled' según el estado */
    <header className={`site-header ${isScrolled ? "is-scrolled" : ""}`}>
      <div className="header-container">
        {/* LOGO */}
        <div className="brand">
          <Link to="/">
            <img
              src={logoImg}
              alt="Surticamisetas"
              className="main-logo"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes("placeholders")) {
                  target.src = "/assets/images/placeholders/logo-light.svg";
                }
              }}
            />
          </Link>
        </div>

        {/* NAVIGATION */}
        <button
          className="menu-toggle"
          type="button"
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMenuOpen}
          onClick={toggleMenu}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={`site-nav ${isMenuOpen ? "open" : ""}`}>
          <Link to="/" onClick={closeMenu}>Inicio</Link>
          <Link to="/nosotros" onClick={closeMenu}>Nosotros</Link>
          <Link to="/catalogo" onClick={closeMenu}>Catálogo</Link>
          <Link to="/contacto" onClick={closeMenu}>Contacto</Link>
        </nav>

        {/* ACTIONS */}
        <div className="header-actions">
          {/* USER */}
          <div className="user-btn-wrapper">
            <Tooltip title={userTooltipTitle}>
              <button className="icon-btn" onClick={handleUserClick} aria-label={role === "cliente" ? "Mi cuenta" : (role ? USER_TOOLTIP[role] ?? "Mi Cuenta" : "Iniciar sesión")}>
                <User size={22} />
              </button>
            </Tooltip>
            {showClienteHint && (
              <span className="profile-hint-badge" aria-hidden="true">!</span>
            )}
          </div>

          {/* LOGOUT */}
          {user && (
            <button className="logout-btn" onClick={handleLogout}>
              Salir
            </button>
          )}

          {/* CART */}
          <Tooltip title="Carrito de compras">
            <button className="cart-wrapper-pro" onClick={goToCart}>
              <ShoppingCart size={24} color="#1a1a1a" />
              {totalItems > 0 && (
                <span className="cart-badge-dynamic">{totalItems}</span>
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};

export default Navbar;