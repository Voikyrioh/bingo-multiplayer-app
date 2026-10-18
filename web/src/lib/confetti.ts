/**
 * Confetti on a single full screen canvas. Particles live a few seconds;
 * the animation loop stops by itself when the last one is gone.
 */
interface Particle {
	x: number
	y: number
	vx: number
	vy: number
	size: number
	rotation: number
	spin: number
	color: string
	shape: 'rect' | 'circle' | 'strip'
	life: number
	ttl: number
}

export interface BurstOptions {
	/** Origin, in CSS pixels (defaults to the center of the screen). */
	x?: number
	y?: number
	count?: number
	power?: number
	/** Angle spread in degrees around straight up. */
	spread?: number
}

const COLORS = ['#6c4cf1', '#ff6b57', '#ffc933', '#22b37b', '#3ba8ff', '#ff8fd0']
const GRAVITY = 0.32
const DRAG = 0.985

export class ConfettiEngine {
	private particles: Particle[] = []
	private frame: number | null = null
	private readonly ctx: CanvasRenderingContext2D | null
	private ratio = 1

	constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly reducedMotion: () => boolean = () => false,
	) {
		this.ctx = canvas.getContext('2d')
		this.resize()
	}

	resize(): void {
		this.ratio = Math.min(window.devicePixelRatio || 1, 2)
		this.canvas.width = window.innerWidth * this.ratio
		this.canvas.height = window.innerHeight * this.ratio
	}

	burst(options: BurstOptions = {}): void {
		const count = this.reducedMotion() ? 0 : (options.count ?? 80)
		const x = options.x ?? window.innerWidth / 2
		const y = options.y ?? window.innerHeight / 2
		const power = options.power ?? 11
		const spread = ((options.spread ?? 70) * Math.PI) / 180
		for (let i = 0; i < count; i++) {
			const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread * 2
			const speed = power * (0.55 + Math.random() * 0.6)
			this.particles.push(this.particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed))
		}
		this.start()
	}

	/** Big celebration: two cannons from the bottom corners plus a rain from the top. */
	celebrate(): void {
		if (this.reducedMotion()) return
		const w = window.innerWidth
		const h = window.innerHeight
		this.burst({ x: 0, y: h, count: 120, power: 20, spread: 25 })
		this.burst({ x: w, y: h, count: 120, power: 20, spread: 25 })
		for (let i = 0; i < 90; i++) {
			this.particles.push(
				this.particle(
					Math.random() * w,
					-20 - Math.random() * h * 0.5,
					(Math.random() - 0.5) * 2,
					2 + Math.random() * 3,
				),
			)
		}
		this.start()
	}

	destroy(): void {
		if (this.frame !== null) cancelAnimationFrame(this.frame)
		this.particles = []
	}

	get active(): number {
		return this.particles.length
	}

	private particle(x: number, y: number, vx: number, vy: number): Particle {
		const shapes: Particle['shape'][] = ['rect', 'circle', 'strip']
		return {
			x,
			y,
			vx: vx + (Math.random() - 0.5) * 2,
			vy,
			size: 6 + Math.random() * 7,
			rotation: Math.random() * Math.PI,
			spin: (Math.random() - 0.5) * 0.3,
			color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
			shape: shapes[Math.floor(Math.random() * shapes.length)] as Particle['shape'],
			life: 0,
			ttl: 180 + Math.random() * 120,
		}
	}

	private start(): void {
		if (this.frame === null && this.ctx) this.frame = requestAnimationFrame(this.tick)
	}

	private readonly tick = () => {
		const ctx = this.ctx
		if (!ctx) return
		const { width, height } = this.canvas
		ctx.clearRect(0, 0, width, height)
		const limit = window.innerHeight + 40
		this.particles = this.particles.filter((p) => p.life < p.ttl && p.y < limit)
		for (const p of this.particles) {
			p.life++
			p.vx *= DRAG
			p.vy = p.vy * DRAG + GRAVITY
			p.x += p.vx
			p.y += p.vy
			p.rotation += p.spin
			const fade = Math.min(1, (p.ttl - p.life) / 40)
			ctx.save()
			ctx.globalAlpha = fade
			ctx.translate(p.x * this.ratio, p.y * this.ratio)
			ctx.rotate(p.rotation)
			ctx.fillStyle = p.color
			const s = p.size * this.ratio
			if (p.shape === 'circle') {
				ctx.beginPath()
				ctx.arc(0, 0, s / 2.4, 0, Math.PI * 2)
				ctx.fill()
			} else if (p.shape === 'strip') {
				ctx.fillRect(-s / 2, -s / 8, s, s / 4)
			} else {
				ctx.fillRect(-s / 2, -s / 3, s, (s * 2) / 3)
			}
			ctx.restore()
		}
		this.frame = this.particles.length ? requestAnimationFrame(this.tick) : null
		if (!this.frame) ctx.clearRect(0, 0, width, height)
	}
}
