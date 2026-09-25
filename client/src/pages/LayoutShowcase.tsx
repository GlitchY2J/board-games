import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  Gamepad2,
  Info,
  Layers3,
  Palette,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PlayingCard from '../components/card/PlayingCard';
import CardSelectionOverlay from '../components/overlay/CardSelectionOverlay';
import '../components/card/CardFan.css';
import '../components/overlay/PendingPlayOverlay.css';
import './LayoutShowcase.css';

type Theme = 'classic' | 'midnight' | 'ember' | 'nebula';

const themes: { id: Theme; name: string; colors: string[] }[] = [
  { id: 'classic', name: 'Obsidiana', colors: ['#0b0b0d', '#64748b', '#cbd5e1'] },
  { id: 'midnight', name: 'Aurora', colors: ['#08152e', '#1d4ed8', '#22d3ee'] },
  { id: 'ember', name: 'Volcan', colors: ['#241313', '#b45309', '#fb7185'] },
  { id: 'nebula', name: 'Nebulosa', colors: ['#1e1035', '#7e22ce', '#f472b6'] },
];

const navItems = ['Fundamentos', 'Botones', 'Campos', 'Labels', 'Cartas', 'Layouts'];

export default function LayoutShowcase() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Fundamentos');
  const [playerName, setPlayerName] = useState('Panda cosmico');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [toggle, setToggle] = useState(true);
  const [overlayDemo, setOverlayDemo] = useState<
    'confirmation' | 'selection' | 'pending-play' | 'card-play' | null
  >(null);

  function setTheme(theme: Theme) {
    document.documentElement.dataset.platformTheme = theme;
    localStorage.setItem('platform-theme', theme);
  }

  function copyRoomCode() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <main className="layout-showcase">
      <div className="layout-showcase-glow layout-showcase-glow-one" />
      <div className="layout-showcase-glow layout-showcase-glow-two" />

      <header className="layout-showcase-header">
        <button className="layout-back" onClick={() => navigate('/')}>
          <ArrowLeft size={17} />
          Volver
        </button>
        <div className="layout-brand">
          <span className="layout-brand-mark"><Layers3 size={18} /></span>
          <span>Board Games UI</span>
          <span className="layout-version">v1.0</span>
        </div>
        <div className="layout-header-status">
          <span className="layout-live-dot" />
          Biblioteca activa
        </div>
      </header>

      <div className="layout-showcase-shell">
        <aside className="layout-showcase-nav" aria-label="Secciones de la presentacion">
          <p className="layout-nav-label">Indice</p>
          {navItems.map((item, index) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className={activeNav === item ? 'active' : ''}
              onClick={() => setActiveNav(item)}
            >
              <span>0{index + 1}</span>
              {item}
            </a>
          ))}
          <div className="layout-nav-note">
            <Sparkles size={16} />
            <p>Componentes reales usados por la plataforma y las mesas de juego.</p>
          </div>
        </aside>

        <div className="layout-showcase-content">
          <section className="layout-hero" id="fundamentos">
            <div>
              <span className="layout-eyebrow">Sistema visual</span>
              <h1>Una mesa consistente,<br /><em>en cada pantalla.</em></h1>
              <p>
                Catalogo interactivo de layouts, controles y estados visuales usados en el proyecto.
              </p>
            </div>
            <div className="layout-hero-orbit" aria-hidden="true">
              <span className="orbit-card orbit-card-back" />
              <span className="orbit-card orbit-card-front" />
              <Gamepad2 size={38} />
            </div>
          </section>

          <section className="layout-section">
            <div className="layout-section-heading">
              <span>01</span>
              <div><h2>Fundamentos</h2><p>Color, superficie, tipografia y ritmo visual.</p></div>
            </div>
            <div className="layout-foundation-grid">
              <Card className="layout-demo-card layout-theme-card">
                <div className="layout-demo-title"><Palette size={17} /><span>Temas de plataforma</span></div>
                <div className="layout-theme-list">
                  {themes.map((theme) => (
                    <button key={theme.id} onClick={() => setTheme(theme.id)}>
                      <span className="layout-theme-swatches">
                        {theme.colors.map((color) => <i key={color} style={{ background: color }} />)}
                      </span>
                      <strong>{theme.name}</strong>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              </Card>
              <Card className="layout-demo-card layout-type-card">
                <span className="layout-spec-label">Tipografia / Outfit</span>
                <div className="layout-type-sample"><strong>Aa</strong><span>0123456789</span></div>
                <h3>Partidas memorables</h3>
                <p>Texto de apoyo para reglas, acciones y mensajes del sistema.</p>
                <div className="layout-weight-row"><span>Regular 400</span><b>Semibold 600</b><strong>Extra 800</strong></div>
              </Card>
            </div>
          </section>

          <section className="layout-section" id="botones">
            <div className="layout-section-heading">
              <span>02</span>
              <div><h2>Botones</h2><p>Acciones primarias, secundarias y destructivas.</p></div>
            </div>
            <Card className="layout-demo-card">
              <div className="layout-control-row">
                <div><span className="layout-spec-label">Default</span><Button>Crear sala</Button></div>
                <div><span className="layout-spec-label">Secondary</span><Button variant="secondary">Cancelar</Button></div>
                <div><span className="layout-spec-label">Danger</span><Button variant="danger">Abandonar</Button></div>
                <div><span className="layout-spec-label">Disabled</span><Button disabled>Esperando...</Button></div>
              </div>
              <div className="layout-icon-buttons">
                <button aria-label="Notificaciones"><Bell size={18} /></button>
                <button aria-label="Informacion"><Info size={18} /></button>
                <button className="danger" aria-label="Cerrar"><X size={18} /></button>
                <button className="layout-room-code" onClick={copyRoomCode}>
                  <span>Sala</span><strong>ABCD</strong>{copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </Card>
          </section>

          <section className="layout-section" id="campos">
            <div className="layout-section-heading">
              <span>03</span>
              <div><h2>Campos</h2><p>Entradas de texto, busqueda y controles de configuracion.</p></div>
            </div>
            <div className="layout-fields-grid">
              <Card className="layout-demo-card">
                <div className="layout-field">
                  <label htmlFor="showcase-name">Nombre del jugador</label>
                  <input id="showcase-name" value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
                  <small>{playerName.length}/15 caracteres</small>
                </div>
                <div className="layout-field">
                  <label htmlFor="showcase-search">Buscar carta</label>
                  <div className="layout-input-icon"><Search size={16} /><input id="showcase-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Unicorn..." /></div>
                </div>
              </Card>
              <Card className="layout-demo-card">
                <div className="layout-setting-row">
                  <div><strong>Partida publica</strong><p>Permite que otros jugadores encuentren la sala.</p></div>
                  <button className={`layout-switch ${toggle ? 'active' : ''}`} onClick={() => setToggle(!toggle)} aria-pressed={toggle}><i /></button>
                </div>
                <div className="layout-field">
                  <label htmlFor="showcase-select">Limite de jugadores</label>
                  <select id="showcase-select" defaultValue="6"><option>4 jugadores</option><option>5 jugadores</option><option value="6">6 jugadores</option></select>
                </div>
                <div className="layout-field-error"><CircleAlert size={15} /><span>Este nombre ya esta en uso.</span></div>
              </Card>
            </div>
          </section>

          <section className="layout-section" id="labels">
            <div className="layout-section-heading">
              <span>04</span>
              <div><h2>Labels y estados</h2><p>Informacion compacta para jugadores, turnos y cartas.</p></div>
            </div>
            <Card className="layout-demo-card layout-label-showcase">
              <div className="layout-badge-row">
                <span className="layout-badge neutral">Espectador</span>
                <span className="layout-badge success"><i /> Tu turno</span>
                <span className="layout-badge warning">Fase de accion</span>
                <span className="layout-badge danger">Bloqueado</span>
                <span className="layout-badge accent">Host</span>
              </div>
              <div className="layout-alert-grid">
                <div className="layout-alert info"><Info size={18} /><div><strong>Informacion</strong><p>El juego y las expansiones se eligen en el lobby.</p></div></div>
                <div className="layout-alert success"><Check size={18} /><div><strong>Accion completada</strong><p>La carta fue llevada correctamente al establo.</p></div></div>
                <div className="layout-alert danger"><CircleAlert size={18} /><div><strong>Accion no valida</strong><p>No puedes jugar esta carta en este momento.</p></div></div>
              </div>
            </Card>
          </section>

          <section className="layout-section" id="cartas">
            <div className="layout-section-heading">
              <span>05</span>
              <div><h2>Cartas</h2><p>Estados principales dentro de una mano o selector.</p></div>
            </div>
            <Card className="layout-demo-card layout-playing-cards">
              <div><span className="layout-spec-label">Default</span><PlayingCard name="Basic Unicorn" image="/cards/unstable-unicorns/base/basic_unicorn_red.png" size="large" /></div>
              <div><span className="layout-spec-label">Selected</span><PlayingCard name="Rainbow Unicorn" image="/cards/unstable-unicorns/base/rainbow_unicorn.png" size="large" selected /></div>
              <div><span className="layout-spec-label">Disabled</span><PlayingCard name="Neigh" image="/cards/unstable-unicorns/base/neigh.png" size="large" disabled /></div>
              <div><span className="layout-spec-label">Hidden</span><PlayingCard name="Carta oculta" image="" size="large" hidden /></div>
            </Card>
          </section>

          <section className="layout-section" id="layouts">
            <div className="layout-section-heading">
              <span>06</span>
              <div><h2>Layouts compuestos</h2><p>Patrones para lobby, historial y confirmaciones.</p></div>
            </div>
            <div className="layout-overlay-examples">
              <article>
                <span className="layout-example-number">A</span>
                <div>
                  <h3>Confirmacion de carta</h3>
                  <p>Se usa despues de seleccionar directamente una carta del CardFan o del establo.</p>
                </div>
                <Button variant="secondary" onClick={() => setOverlayDemo('confirmation')}>Ver ejemplo</Button>
              </article>
              <article>
                <span className="layout-example-number">B</span>
                <div>
                  <h3>Seleccion de cartas</h3>
                  <p>Permite elegir una o varias cartas antes de confirmar una accion del juego.</p>
                </div>
                <Button variant="secondary" onClick={() => setOverlayDemo('selection')}>Ver ejemplo</Button>
              </article>
              <article>
                <span className="layout-example-number">C</span>
                <div>
                  <h3>Pending Play</h3>
                  <p>Layout que aparece mientras una carta esta por resolverse y espera reacciones.</p>
                </div>
                <Button variant="secondary" onClick={() => setOverlayDemo('pending-play')}>Ver ejemplo</Button>
              </article>
              <article>
                <span className="layout-example-number">D</span>
                <div>
                  <h3>Accion desde CardFan</h3>
                  <p>Confirmacion que aparece al hacer click en una carta de la mano.</p>
                </div>
                <Button variant="secondary" onClick={() => setOverlayDemo('card-play')}>Ver ejemplo</Button>
              </article>
            </div>
            <div className="layout-compositions">
              <Card className="layout-demo-card layout-lobby-preview">
                <div className="layout-demo-title"><Users size={17} /><span>Lobby de jugadores</span><small>3 / 6</small></div>
                {['Panda cosmico', 'Meeple azul', 'Invitado'].map((name, index) => (
                  <div className="layout-player-row" key={name}>
                    <span className={`layout-avatar avatar-${index}`}>{name.slice(0, 2)}</span>
                    <div><strong>{name}</strong><small>{index === 0 ? 'Anfitrion' : 'Listo para jugar'}</small></div>
                    <span className={index === 2 ? 'waiting' : 'ready'}>{index === 2 ? 'Esperando' : 'Listo'}</span>
                  </div>
                ))}
              </Card>

              <Card className="layout-demo-card layout-history-preview">
                <div className="layout-demo-title"><Layers3 size={17} /><span>Historial</span><small>Ronda 4</small></div>
                <div className="layout-history-row system">Comenzo el turno de Panda cosmico</div>
                <div className="layout-history-row"><span>Panda</span><p>robo una carta del mazo</p></div>
                <div className="layout-history-row"><span>Meeple</span><p>jugo Rainbow Unicorn</p></div>
                <div className="layout-history-row"><span>Panda</span><p>descarto una carta por Barbed Wire</p></div>
              </Card>

              <div className="layout-dialog-preview">
                <span className="layout-spec-label">Confirmacion compacta</span>
                <div className="layout-dialog-card">
                  <span className="layout-dialog-icon"><Sparkles size={21} /></span>
                  <h3>Rainbow Unicorn</h3>
                  <p>¿Deseas traer esta carta de tu mano a tu establo?</p>
                  <div><button>Cancelar</button><button className="confirm">Confirmar</button></div>
                </div>
              </div>
            </div>
          </section>

          <footer className="layout-showcase-footer">
            <span>Board Games UI Library</span>
            <p>Una referencia viva de los componentes del proyecto.</p>
          </footer>
        </div>
      </div>

      {overlayDemo === 'confirmation' && (
        <CardSelectionOverlay
          title="Rainbow Unicorn"
          subtitle="¿Deseas traer Basic Unicorn de tu mano a tu establo?"
          items={[{
            id: 'basic-confirmation',
            value: 'basic-confirmation',
            title: 'Basic Unicorn',
            image: '/cards/unstable-unicorns/base/basic_unicorn_red.png',
          }]}
          maxSelection={1}
          confirmText="Confirmar"
          showSelection={false}
          compact
          keyboardNavigation={false}
          buttonHotkeys
          onConfirm={() => setOverlayDemo(null)}
          onCancel={() => setOverlayDemo(null)}
        />
      )}

      {overlayDemo === 'selection' && (
        <CardSelectionOverlay
          title="Selecciona tus cartas"
          subtitle="Elige hasta 2 cartas para continuar con el efecto."
          items={[
            {
              id: 'selection-basic',
              value: 'selection-basic',
              title: 'Basic Unicorn',
              image: '/cards/unstable-unicorns/base/basic_unicorn_red.png',
            },
            {
              id: 'selection-rainbow',
              value: 'selection-rainbow',
              title: 'Rainbow Unicorn',
              image: '/cards/unstable-unicorns/base/rainbow_unicorn.png',
            },
            {
              id: 'selection-neigh',
              value: 'selection-neigh',
              title: 'Neigh',
              image: '/cards/unstable-unicorns/base/neigh.png',
            },
          ]}
          minSelection={1}
          maxSelection={2}
          confirmText="Confirmar"
          searchable
          searchPlaceholder="Buscar carta..."
          onConfirm={() => setOverlayDemo(null)}
          onCancel={() => setOverlayDemo(null)}
        />
      )}

      {overlayDemo === 'pending-play' && (
        <div className="pending-play-backdrop layout-pending-demo">
          <div className="pending-play-window">
            <button
              className="layout-demo-overlay-close"
              aria-label="Cerrar ejemplo"
              onClick={() => setOverlayDemo(null)}
            >
              <X size={16} />
            </button>
            <h2 className="pending-play-title">Meeple azul juega una carta</h2>
            <p className="pending-play-subtitle">¿Tienes un Neigh para detenerla? Se resuelve en 8s</p>
            <div className="pending-play-card">
              <PlayingCard
                name="Rainbow Unicorn"
                image="/cards/unstable-unicorns/base/rainbow_unicorn.png"
                size="xlarge"
                preview={false}
              />
            </div>
            <div className="pending-play-card-name">Rainbow Unicorn</div>
            <div className="pending-play-timer">
              <div className="pending-play-progress" style={{ width: '45%' }} />
              <span className="pending-play-timer-seconds">8</span>
            </div>
            <div className="pending-play-actions">
              <button type="button" data-pending-option="1" className="pending-accept-btn" onClick={() => setOverlayDemo(null)}>
                <kbd>1</kbd> Aceptar
              </button>
              <button type="button" data-pending-option="2" className="pending-neigh-btn" onClick={() => setOverlayDemo(null)}>
                <kbd>2</kbd> Neigh
              </button>
            </div>
          </div>
        </div>
      )}

      {overlayDemo === 'card-play' && (
        <div className="card-select-backdrop" onClick={() => setOverlayDemo(null)}>
          <div className="card-select-pop" onClick={(event) => event.stopPropagation()}>
            <PlayingCard
              name="Rainbow Unicorn"
              image="/cards/unstable-unicorns/base/rainbow_unicorn.png"
               size="large"
               preview={false}
               hoverSound={false}
            />
            <div className="card-select-actions flex items-center justify-center gap-4 px-6 py-4 rounded-3xl glass-panel bg-slate-950/90 shadow-2xl">
              <button
                className="cancel-button"
                onClick={() => setOverlayDemo(null)}
              >
                <kbd>1</kbd>
                Cancelar
              </button>
              <button
                data-card-confirm
                className="confirm-button"
                onClick={() => setOverlayDemo(null)}
              >
                <kbd>2</kbd>
                Jugar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
