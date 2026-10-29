import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, ShoppingBasket, MessageCircle, ChefHat, Leaf, Clock3, Plus, Minus, Check, ChevronLeft, ChevronRight, Search, Sparkles, X, ArrowUpRight, LogOut, Mail, LockKeyhole, UserRound, Menu, Heart, ExternalLink, UtensilsCrossed, Soup, Coffee, Salad, Archive, Trash2 } from 'lucide-react'
import mowmLogo from './assets/mowm-logo.png'
import './style.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
function BrandWordmark() {
  return <span className="brand-copy">MOWM</span>
}
const recipes = {
  'Lemon ricotta pancakes': { image: 'photo-1528207776546-365bb710ee93', tag: 'A little sunshine', time: '20 min', ingredients: ['1 cup all-purpose flour', '½ cup creamy ricotta', '2 eggs', '1 lemon, zested', '¾ cup milk', '1 tsp baking powder', 'Maple syrup & berries'], steps: ['Whisk together the flour, baking powder, and a pinch of salt.', 'In a separate bowl, combine ricotta, eggs, milk, and lemon zest.', 'Fold the wet ingredients into the dry just until combined.', 'Cook spoonfuls on a warm, buttered skillet until golden, then flip.', 'Serve warm with berries and a generous drizzle of maple syrup.'] },
  'Green goddess grain bowl': { image: 'photo-1512621776951-a57141f2eefd', tag: 'Good for you', time: '25 min', ingredients: ['1 cup cooked quinoa', '1 ripe avocado', '1 cup cucumber, sliced', '2 cups baby greens', '½ cup edamame', '2 tbsp tahini', '1 lemon'], steps: ['Cook your quinoa according to its package. Fluff with a fork.', 'Blend tahini with lemon juice, a splash of water, and salt.', 'Build bowls with warm quinoa, greens, cucumber, and edamame.', 'Fan the sliced avocado over each bowl.', 'Finish with the dressing and a little flaky salt.'] },
  'Miso butter salmon': { image: 'photo-1467003909585-2f8a72700288', tag: 'A weeknight favorite', time: '30 min', ingredients: ['2 salmon fillets', '1 tbsp white miso', '2 tbsp softened butter', '1 tbsp honey', '1 cup jasmine rice', 'Tenderstem broccoli', '1 lime'], steps: ['Heat your oven to 400°F (200°C). Line a baking sheet.', 'Mix the miso, softened butter, honey, and a squeeze of lime.', 'Brush over salmon and roast for 12–15 minutes.', 'Steam the broccoli and prepare rice in the meantime.', 'Serve together with the buttery pan juices and extra lime.'] },
  'Creamy tomato orzo': { image: 'photo-1476224203421-9ac39bcb3327', tag: 'Comfort in a bowl', time: '25 min', ingredients: ['1½ cups orzo', '2 cups cherry tomatoes', '2 garlic cloves, minced', '3 cups vegetable broth', '½ cup heavy cream', '½ cup parmesan', 'Fresh basil'], steps: ['Warm olive oil in a deep pan. Add garlic and cook until fragrant.', 'Add halved tomatoes and a pinch of salt, then simmer for 5 minutes.', 'Stir in the orzo and broth. Cover and simmer for 10 minutes.', 'Add cream and grated parmesan, stirring until glossy and tender.', 'Tear over plenty of basil. Serve with extra parmesan.'] },
  'Honey halloumi wraps': { image: 'photo-1512621776951-a57141f2eefd', tag: 'Ready in a flash', time: '15 min', ingredients: ['225g halloumi, sliced', '2 flatbreads', '2 tbsp honey', '1 cucumber', 'A handful of rocket', '3 tbsp Greek yogurt', '1 tsp harissa'], steps: ['Mix Greek yogurt with harissa and a pinch of salt.', 'Slice cucumber into ribbons with a vegetable peeler.', 'Pan-fry halloumi for 2 minutes per side until golden.', 'Drizzle honey over the halloumi for the last 30 seconds.', 'Layer flatbreads with yogurt, rocket, cucumber, and halloumi.'] },
  'Roasted veggie toast': { image: 'photo-1525351484163-7529414344d8', tag: 'Slow morning', time: '20 min', ingredients: ['2 slices sourdough', '1 small zucchini', '1 red pepper', '½ avocado', 'Feta cheese', '1 tbsp olive oil', 'Fresh dill'], steps: ['Chop the zucchini and pepper; toss with olive oil and salt.', 'Roast at 425°F (220°C) for 15 minutes, until golden.', 'Toast the sourdough until crisp and just the way you like it.', 'Smash the avocado over each piece of toast.', 'Pile the roast vegetables on top, then finish with crumbled feta and dill.'] },
  'Sunday veggie frittata': { image: 'photo-1525351484163-7529414344d8', tag: 'Make a little extra', time: '30 min', ingredients: ['6 free-range eggs', '1 small courgette', 'Handful baby spinach', '½ cup feta', '2 tbsp milk', 'Fresh chives', 'Olive oil'], steps: ['Whisk eggs with milk, salt, and cracked black pepper.', 'Sauté sliced courgette until soft, then wilt in the spinach.', 'Pour the egg mixture into the oven-safe skillet.', 'Scatter over crumbled feta. Cook gently until the edges set.', 'Grill for 3–4 minutes until golden and just set. Scatter with chives.'] },
  'Overnight berry oats': { image: 'photo-1490474418585-ba9bad8fd0ea', tag: 'Breakfast made easy', time: '5 min + overnight', ingredients: ['½ cup rolled oats', '½ cup oat milk', '1 tbsp chia seeds', '1 tsp honey', '½ cup mixed berries', '2 tbsp Greek yogurt', 'A little toasted coconut'], steps: ['Add oats, oat milk, chia, and honey to a jar.', 'Stir until well combined and put a lid on the jar.', 'Refrigerate overnight or for at least 4 hours.', 'In the morning, give everything one more stir.', 'Top with yogurt, fresh berries, and toasted coconut.'] },
  'Herby lemon couscous': { image: 'photo-1476224203421-9ac39bcb3327', tag: 'Light & lovely', time: '20 min', ingredients: ['1 cup couscous', '1 lemon', '1 cucumber', '½ cup parsley', '1 can chickpeas', '3 tbsp olive oil', '50g crumbled feta'], steps: ['Pour boiling vegetable stock over the couscous, cover, and leave for 5 minutes.', 'Drain the chickpeas. Roughly chop the cucumber and parsley.', 'Fluff the couscous with a fork and stir in lemon zest and olive oil.', 'Fold in the cucumber, chickpeas, parsley, and lemon juice.', 'Scatter over crumbled feta and season generously.'] },
  'One-pan chickpea curry': { image: 'photo-1547592180-85f173990554', tag: 'Cozy & colorful', time: '35 min', ingredients: ['1 can chickpeas', '1 can chopped tomatoes', '1 can coconut milk', '1 onion, diced', '2 tbsp mild curry paste', '2 cups baby spinach', 'Steamed basmati rice'], steps: ['Cook the onion in oil until softened, about 5 minutes.', 'Stir in the curry paste and cook for one more minute.', 'Add tomatoes, coconut milk, and drained chickpeas.', 'Simmer gently for 20 minutes until thick and fragrant.', 'Stir in spinach until wilted. Spoon over rice.'] },
  'Peach & burrata salad': { image: 'photo-1512621776951-a57141f2eefd', tag: 'A little summer', time: '15 min', ingredients: ['2 ripe peaches', '1 ball creamy burrata', '2 cups mixed greens', '½ cup toasted walnuts', '1 tbsp balsamic glaze', 'Fresh mint', 'Extra virgin olive oil'], steps: ['Arrange the mixed greens on a big serving platter.', 'Slice the peaches into thin wedges and layer over the greens.', 'Tear the burrata into pieces and tuck them among the peaches.', 'Scatter over toasted walnuts and torn mint leaves.', 'Drizzle with olive oil, balsamic, and a little flaky salt.'] },
  'Pesto pasta': { image: 'photo-1473093295043-cdd812d0e601', tag: 'A family favorite', time: '20 min', ingredients: ['250g short pasta', '3 tbsp good basil pesto', '1 cup cherry tomatoes', '½ cup parmesan', 'Fresh basil', '1 tbsp pine nuts', 'Extra virgin olive oil'], steps: ['Bring a large pot of salted water to the boil. Cook the pasta until al dente.', 'Halve the tomatoes and warm gently in olive oil in a wide skillet.', 'Save a mugful of pasta water, then drain the pasta.', 'Toss pasta with the pesto, adding pasta water until silky.', 'Finish with parmesan, basil leaves, and a scatter of pine nuts.'] },
  'Mushroom & spinach toast': { image: 'photo-1525351484163-7529414344d8', tag: 'A savory start', time: '15 min', ingredients: ['2 slices sourdough', '200g mushrooms, sliced', '1 cup baby spinach', '2 tbsp cream cheese', '1 garlic clove', 'Fresh thyme', 'Olive oil'], steps: ['Toast both slices of sourdough to your liking.', 'Sauté the sliced mushrooms in olive oil until deeply golden.', 'Add crushed garlic, thyme, and a pinch of sea salt.', 'Fold in the spinach until just wilted.', 'Spread cream cheese on the toast and pile over the mushrooms.'] },
  'Crispy tofu rice bowl': { image: 'photo-1512621776951-a57141f2eefd', tag: 'A crunchy little bowl', time: '25 min', ingredients: ['200g firm tofu', '1 cup short-grain rice', '1 carrot', '½ cucumber', '2 tbsp soy sauce', '1 tbsp sesame seeds', '2 tbsp spicy mayo'], steps: ['Cook the rice according to the package. Drain and press the tofu.', 'Dice tofu and pan-fry with soy sauce until crisp on all sides.', 'Ribbon the carrot and cucumber with a vegetable peeler.', 'Divide rice between bowls. Arrange crisp tofu and crunchy vegetables.', 'Finish with sesame seeds and a generous spicy mayo drizzle.'] },
  'Banana cinnamon oats': { image: 'photo-1490474418585-ba9bad8fd0ea', tag: 'A warm hug', time: '10 min', ingredients: ['½ cup rolled oats', '1 cup oat milk', '1 ripe banana', '1 tsp cinnamon', '1 tbsp almond butter', '1 tbsp chopped walnuts'], steps: ['Add the oats and oat milk to a small saucepan over medium heat.', 'Mash half the banana and stir it into the oats with cinnamon.', 'Cook gently, stirring often, until creamy, about 5 minutes.', 'Pour into a bowl and top with sliced banana.', 'Add almond butter and toasted walnuts.'] },
  'Butternut squash soup': { image: 'photo-1547592180-85f173990554', tag: 'A cozy classic', time: '40 min', ingredients: ['1 medium butternut squash', '1 onion', '3 cups vegetable broth', '½ cup coconut milk', '½ tsp ground cumin', 'Pumpkin seeds', 'Sourdough to serve'], steps: ['Peel, deseed, and roughly dice the butternut squash.', 'Cook the onion in olive oil until soft, then add cumin.', 'Add squash and broth. Simmer for about 25 minutes until very tender.', 'Blend until completely smooth; stir through coconut milk.', 'Serve with toasted pumpkin seeds and good crusty bread.'] },
  'Garlic butter shrimp': { image: 'photo-1467003909585-2f8a72700288', tag: 'A little coastal magic', time: '20 min', ingredients: ['250g raw king prawns', '200g spaghetti', '3 garlic cloves', '50g salted butter', '1 lemon', 'Fresh parsley', 'Pinch chilli flakes'], steps: ['Boil the spaghetti in generously salted water until al dente.', 'Melt butter in a large skillet. Add finely sliced garlic.', 'Add prawns and chilli flakes; cook for 2 minutes per side.', 'Toss in drained spaghetti with a splash of pasta water.', 'Finish with lemon zest, parsley, and a good squeeze of lemon.'] },
  'Crispy potato tacos': { image: 'photo-1547592180-85f173990554', tag: 'Taco night, sorted', time: '35 min', ingredients: ['300g baby potatoes', '6 small soft tortillas', '1 tsp smoked paprika', '½ red cabbage', '1 lime', '3 tbsp sour cream', 'Fresh coriander'], steps: ['Chop potatoes into bite-size pieces and toss with oil and smoked paprika.', 'Roast at 425°F (220°C) for 25 minutes until crisp outside.', 'Shred the cabbage and squeeze over half a lime.', 'Warm the tortillas in a dry skillet until softened.', 'Fill with crispy potatoes, cabbage, sour cream, and coriander.'] }
}

const AMOUNT_FRACTIONS = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }
const GROCERY_UNITS = [
  { base: 'g', factor: 1, display: 'g', aliases: ['g', 'gram', 'grams'] },
  { base: 'g', factor: 1000, display: 'kg', aliases: ['kg', 'kilogram', 'kilograms'] },
  { base: 'g', factor: 28.3495, display: 'oz', aliases: ['oz', 'ounce', 'ounces'] },
  { base: 'g', factor: 453.592, display: 'lb', aliases: ['lb', 'lbs', 'pound', 'pounds'] },
  { base: 'ml', factor: 1, display: 'ml', aliases: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'] },
  { base: 'ml', factor: 1000, display: 'l', aliases: ['l', 'liter', 'liters', 'litre', 'litres'] },
  { base: 'ml', factor: 4.92892, display: 'tsp', aliases: ['tsp', 'teaspoon', 'teaspoons'] },
  { base: 'ml', factor: 14.7868, display: 'tbsp', aliases: ['tbsp', 'tablespoon', 'tablespoons'] },
  { base: 'ml', factor: 236.588, display: 'cup', aliases: ['cup', 'cups'] },
]
const COUNT_UNITS = ['clove', 'egg', 'can', 'fillet', 'piece', 'slice', 'head', 'bunch', 'sprig', 'tortilla', 'lemon', 'lime', 'onion', 'tomato', 'potato', 'pepper']
const COUNT_DESCRIPTORS = ['large', 'small', 'medium', 'ripe', 'fresh', 'free-range', 'soft', 'whole', 'baby', 'raw']
const countUnitPattern = unit => `${unit}|${unit.endsWith('y') ? `${unit.slice(0, -1)}ies` : /(?:ch|sh|s|x|z|o)$/.test(unit) ? `${unit}es` : `${unit}s`}`

function amountValue(value) {
  const text = value.trim()
  const mixed = text.match(/^(\d+)\s*(?:([¼½¾⅓⅔⅛⅜⅝⅞])|(\d+)\/(\d+))$/)
  if (mixed) return Number(mixed[1]) + (mixed[2] ? AMOUNT_FRACTIONS[mixed[2]] : Number(mixed[3]) / Number(mixed[4]))
  if (AMOUNT_FRACTIONS[text]) return AMOUNT_FRACTIONS[text]
  if (/^\d+\/\d+$/.test(text)) { const [n, d] = text.split('/').map(Number); return d ? n / d : NaN }
  return Number(text)
}

function parseAmountPrefix(value) {
  const match = value.match(/^((?:\d+\s+\d+\/\d+|\d+\s*[¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞]|\d+(?:\.\d+)?))(?:\s+|$)(.*)$/i)
  return match ? { amount: amountValue(match[1]), rest: match[2].trim() } : null
}

function cleanIngredientName(value) {
  let name = value.split(/[,;(]/, 1)[0].trim().toLocaleLowerCase().replace(/\s+/g, ' ')
  name = name.replace(/\b(torn|chopped|minced|diced|sliced|grated|freshly ground|to taste)\b/g, '').replace(/\s+/g, ' ').trim()
  name = name.replace(/\b(tomatoes|potatoes)$/g, (_, word) => word === 'tomatoes' ? 'tomato' : 'potato')
  name = name.replace(/ies$/, 'y')
  if (/\b(cloves|eggs|cans|fillets|pieces|slices|heads|bunches|sprigs|tortillas|lemons|limes|onions|peppers)$/.test(name)) name = name.replace(/s$/, '')
  else if (/\b(bananas|carrots|apples|oranges|cucumbers|mushrooms|walnuts|berries)$/.test(name)) name = name.replace(/s$/, '')
  return name
}

function parseGroceryEntry(item) {
  let name = String(item.name || '').trim()
  let amount = null
  let unit = ''
  const amountText = String(item.qty || item.quantity || '').trim()
  if (amountText) {
    const parsed = parseAmountPrefix(amountText)
    if (parsed && Number.isFinite(parsed.amount)) { amount = parsed.amount; unit = parsed.rest.toLocaleLowerCase() }
    else name = `${amountText} ${name}`
  }
  if (amount === null) {
    const parsed = parseAmountPrefix(name)
    if (parsed && Number.isFinite(parsed.amount)) { amount = parsed.amount; name = parsed.rest }
  }

  const sourceUnit = unit || name.match(/^([^\s]+)\s/)?.[1]?.toLocaleLowerCase()
  const unitEntry = GROCERY_UNITS.find(entry => entry.aliases.includes(sourceUnit))
  if (unitEntry) {
    const aliases = unitEntry.aliases
    if (!unit) { const matched = aliases.find(alias => name.toLocaleLowerCase().startsWith(`${alias} `)); name = name.slice(matched.length).trim() }
    amount = amount === null ? null : amount * unitEntry.factor
    unit = unitEntry.base
  }
  if (amount !== null && !unit) {
    name = name.split(/[,;(]/, 1)[0].trim()
    const leadingCountUnit = COUNT_UNITS.find(candidate => name.toLocaleLowerCase().match(new RegExp(`^(?:${countUnitPattern(candidate)})\\s+`)))
    if (leadingCountUnit) {
      name = name.replace(new RegExp(`^(?:${countUnitPattern(leadingCountUnit)})\\s+`, 'i'), '').trim()
      unit = leadingCountUnit
    } else {
      const suffixUnit = COUNT_UNITS.find(candidate => name.toLocaleLowerCase().match(new RegExp(`\\b(?:${countUnitPattern(candidate.trim())})$`)))
      if (suffixUnit) {
        const suffix = new RegExp(`\\s+(?:${countUnitPattern(suffixUnit.trim())})$`, 'i')
        const ingredientBeforeUnit = name.replace(suffix, '').trim()
        if (ingredientBeforeUnit && !COUNT_DESCRIPTORS.includes(ingredientBeforeUnit.toLocaleLowerCase())) { name = ingredientBeforeUnit; unit = suffixUnit.trim() }
        else if (ingredientBeforeUnit) { name = suffixUnit.trim(); unit = 'count' }
        else unit = 'count'
      } else unit = 'count'
    }
  }
  const ingredient = cleanIngredientName(name)
  if (!ingredient) return null
  return { ingredient, amount, unit: unit.toLowerCase(), displayUnit: unitEntry?.display || unit, displayFactor: unitEntry?.factor || 1, section: item.section || 'Ingredients', checked: Boolean(item.checked) }
}

function groceryGroupsFromPlan(plan) {
  const source = Array.isArray(plan?.groceryList) && plan.groceryList.length
    ? plan.groceryList.map(item => ({ name: item.name, qty: item.quantity || '', section: item.section || 'Ingredients', checked: Boolean(item.checked) }))
    : (plan?.days || []).flatMap(day => ['breakfast', 'lunch', 'dinner'].flatMap(type =>
      (day[type]?.ingredients || []).map(name => ({ name, qty: '', section: 'Ingredients', checked: false }))
    ))
  const totals = new Map()
  for (const item of source) {
    const parsed = parseGroceryEntry(item)
    if (!parsed) continue
    const key = `${parsed.ingredient}|${parsed.unit}`
    const previous = totals.get(key)
    if (!previous) totals.set(key, { ...parsed, amount: parsed.amount ?? 0, measured: parsed.amount !== null })
    else if (parsed.amount !== null) { previous.amount += parsed.amount; previous.measured = true; previous.checked = previous.checked && parsed.checked }
  }
  const formatAmount = amount => Number(amount.toFixed(2)).toString()
  const collected = [...totals.values()]
  const measuredIngredients = new Set(collected.filter(item => item.measured).map(item => item.ingredient))
  const consolidated = collected.filter(item => item.measured || !measuredIngredients.has(item.ingredient)).map(item => {
    let amount = item.amount / item.displayFactor
    let unit = item.displayUnit
    if (item.measured && unit === 'g' && amount >= 1000) { amount /= 1000; unit = 'kg' }
    if (item.measured && unit === 'ml' && amount >= 1000) { amount /= 1000; unit = 'l' }
    const unitLabels = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', count: '', cup: amount === 1 ? 'cup' : 'cups', clove: amount === 1 ? 'clove' : 'cloves', egg: amount === 1 ? 'egg' : 'eggs', can: amount === 1 ? 'can' : 'cans', fillet: amount === 1 ? 'fillet' : 'fillets', piece: amount === 1 ? 'piece' : 'pieces', slice: amount === 1 ? 'slice' : 'slices', head: amount === 1 ? 'head' : 'heads', bunch: amount === 1 ? 'bunch' : 'bunches', sprig: amount === 1 ? 'sprig' : 'sprigs', tortilla: amount === 1 ? 'tortilla' : 'tortillas', lemon: amount === 1 ? 'lemon' : 'lemons', lime: amount === 1 ? 'lime' : 'limes', onion: amount === 1 ? 'onion' : 'onions', tomato: amount === 1 ? 'tomato' : 'tomatoes', potato: amount === 1 ? 'potato' : 'potatoes', pepper: amount === 1 ? 'pepper' : 'peppers' }
    const displayUnit = unitLabels[unit] ?? unit
    return { name: item.ingredient, qty: item.measured ? `${formatAmount(amount)}${displayUnit ? ` ${displayUnit}` : ''}` : '', section: item.section, checked: item.checked }
  })
  const groups = new Map()
  for (const item of consolidated) groups.set(item.section, [...(groups.get(item.section) || []), item])
  return [...groups].map(([section, items]) => ({
    section,
    items: items.map((item, index) => ({ ...item, id: `${section}:${item.name}:${item.qty}:${index}` })),
  }))
}

const API_AUTH = import.meta.env.VITE_AUTH_API_URL
const API_MEAL = import.meta.env.VITE_MEAL_API_URL
const API_MEAL_PLANS = import.meta.env.VITE_MEAL_PLAN_API_URL
async function requestAuth(mode, form) {
  if (!API_AUTH) throw new Error('Authentication service is not configured. Set VITE_AUTH_API_URL and restart the client.')
  const endpoint = API_AUTH.replace(/\/$/, '')
  const payload = mode === 'register'
    ? { name: form.name.trim(), email: form.email.trim(), password: form.password }
    : { email: form.email.trim(), password: form.password }
  let res
  try {
    res = await fetch(`${endpoint}/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Could not reach the user-auth-service. Start it and check VITE_AUTH_API_URL.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const fieldErrors = Array.isArray(data.errors)
      ? data.errors.map(error => typeof error === 'string' ? error : `${error.field ? `${error.field}: ` : ''}${error.message || error.defaultMessage || 'Invalid value.'}`)
      : data.errors && typeof data.errors === 'object'
        ? Object.entries(data.errors).flatMap(([field, errors]) => (Array.isArray(errors) ? errors : [errors]).map(error => `${field}: ${error}`))
        : []
    const errors = [...fieldErrors]
    const generalError = data.detail || data.message || data.error
    if (generalError && !errors.includes(generalError)) errors.push(generalError)
    if (!errors.length) errors.push(`Authentication failed (${res.status}). Check your details and try again.`)
    const error = new Error(errors[0])
    error.validationErrors = errors
    throw error
  }
  const user = data.user || data
  const sessionUser = {
    id: user.id,
    name: user.name || user.fullName || form.name || form.email.split('@')[0],
    email: user.email || form.email,
  }
  return sessionUser
}

function Photo({ id, className = '' }) { const fallback = `https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=720&q=80`; const src = /^https?:\/\//i.test(id || '') ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=720&q=80`; return <img className={className} src={src} onError={event => { if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback }} alt="A freshly prepared dish" loading="lazy" /> }

function validateAuthForm(mode, form) {
  const errors = []
  const name = form.name.trim()
  const email = form.email.trim()
  const password = form.password
  if (mode === 'register' && !name) errors.push('Name is required.')
  if (mode === 'register' && name.length > 100) errors.push('Name must be 100 characters or fewer.')
  if (!email) errors.push('Email address is required.')
  else if (email.length > 254) errors.push('Email address must be 254 characters or fewer.')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Enter a valid email address.')
  if (!password) errors.push('Password is required.')
  else if (mode === 'register' && password.length < 8) errors.push('Password must be at least 8 characters.')
  else if (password.length > 72) errors.push('Password must be 72 characters or fewer.')
  return errors
}

function App() {
  const mealFrameRef = useRef(null)
  const [user, setUser] = useState(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [page, setPage] = useState('calendar')
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authErrors, setAuthErrors] = useState([])
  const [authSuccess, setAuthSuccess] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [activeRecipe, setActiveRecipe] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [grocery, setGrocery] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [chat, setChat] = useState([{ role: 'assistant', content: "Hey, welcome to your kitchen 🍋 Tell me what you’re in the mood for, and I’ll put together a meal plan that feels like you." }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [mealPlanFromDb, setMealPlanFromDb] = useState(null)
  const [mealPlanError, setMealPlanError] = useState('')
  const [pdfExportLoading, setPdfExportLoading] = useState(false)
  const [pdfArchive, setPdfArchive] = useState([])
  const [pdfArchiveLoading, setPdfArchiveLoading] = useState(false)
  const [pdfArchiveError, setPdfArchiveError] = useState('')
  const [pdfDeletingId, setPdfDeletingId] = useState('')
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    if (!API_AUTH) { setSessionChecked(true); return }
    fetch(`${API_AUTH.replace(/\/$/, '')}/api/auth/session`, { credentials: 'include' })
      .then(async response => response.ok ? response.json() : null)
      .then(data => {
        if (!data) return
        const sessionUser = data.user || data
        setUser({ id: sessionUser.id, name: sessionUser.name || sessionUser.fullName || '', email: sessionUser.email || '' })
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true))
  }, [])

  useEffect(() => {
    function receiveMealPlan(event) {
      if (!API_MEAL || event.source !== mealFrameRef.current?.contentWindow) return
      let expectedOrigin
      try { expectedOrigin = new URL(API_MEAL).origin } catch { return }
      if (event.origin !== expectedOrigin || event.data?.type !== 'mowm:meal-plan-saved') return
      const plan = event.data.plan
      if (plan?.ownerId !== String(user?.id || user?.email) || !Array.isArray(plan.days) || plan.days.length !== 7) return
      const currentMonday = new Date()
      currentMonday.setDate(currentMonday.getDate() - ((currentMonday.getDay() + 6) % 7))
      const currentWeekStart = `${currentMonday.getFullYear()}-${String(currentMonday.getMonth() + 1).padStart(2, '0')}-${String(currentMonday.getDate()).padStart(2, '0')}`
      if (weekOffset !== 0 || plan.weekStart !== currentWeekStart) return
      setMealPlanFromDb(plan)
      setGrocery(groceryGroupsFromPlan(plan))
      setMealPlanError('')
      flash('Saved generated meals to My week.')
    }
    window.addEventListener('message', receiveMealPlan)
    return () => window.removeEventListener('message', receiveMealPlan)
  }, [weekOffset, user?.id, user?.email])

  useEffect(() => {
    if (page !== 'archive' || !API_MEAL_PLANS || !(user?.id || user?.email)) return
    let cancelled = false
    setPdfArchiveLoading(true)
    setPdfArchiveError('')
    setPdfArchive([])
    const ownerId = String(user.id || user.email)
    fetch(`${API_MEAL_PLANS.replace(/\/$/, '')}/api/pdf-archive?ownerId=${encodeURIComponent(ownerId)}`)
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Could not load your saved PDFs.')
        if (!cancelled) setPdfArchive(Array.isArray(data) ? data : [])
      })
      .catch(error => { if (!cancelled) { setPdfArchive([]); setPdfArchiveError(error.message) } })
      .finally(() => { if (!cancelled) setPdfArchiveLoading(false) })
    return () => { cancelled = true }
  }, [page, user?.id, user?.email])

  useEffect(() => {
    setMealPlanFromDb(null)
    setGrocery([])
    setMealPlanError('')
    if (!API_MEAL_PLANS || !(user?.id || user?.email)) return
    let cancelled = false
    const date = new Date()
    date.setDate(date.getDate() + weekOffset * 7)
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    const weekStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const ownerId = String(user.id || user.email)
    fetch(`${API_MEAL_PLANS.replace(/\/$/, '')}/api/meal-plans?ownerId=${encodeURIComponent(ownerId)}&weekStart=${weekStart}`)
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Could not load the saved meal plan.')
        if (!cancelled) {
          const plan = Array.isArray(data) ? data[0] || null : null
          setMealPlanFromDb(plan)
          setGrocery(groceryGroupsFromPlan(plan))
          setMealPlanError('')
        }
      })
      .catch(error => { if (!cancelled) { setMealPlanFromDb(null); setMealPlanError(error.message) } })
    return () => { cancelled = true }
  }, [weekOffset, user?.id, user?.email])

  const login = async (event) => {
    event.preventDefault()
    const validationErrors = validateAuthForm(authMode, authForm)
    if (validationErrors.length) { setAuthErrors(validationErrors); return }
    setAuthErrors([]); setAuthSuccess(''); setAuthLoading(true)
    try {
      if (authMode === 'register') {
        await requestAuth('register', authForm)
        setAuthMode('login')
        setAuthForm({ name: '', email: authForm.email, password: '' })
        setAuthSuccess('Account created. Please log in to continue.')
      } else {
        const result = await requestAuth('login', authForm)
        setUser(result)
      }
    }
    catch (e) { setAuthErrors(e.validationErrors || [e.message || 'Something went wrong. Please try again.']) }
    finally { setAuthLoading(false) }
  }
  const signOut = async () => {
    if (API_AUTH) {
      try { await fetch(`${API_AUTH.replace(/\/$/, '')}/api/auth/logout`, { method: 'POST', credentials: 'include' }) } catch {}
    }
    localStorage.removeItem('gather_user')
    localStorage.removeItem('gather_token')
    setUser(null)
    setAuthMode('login')
    setAuthForm({ name: '', email: '', password: '' })
    setAuthErrors([])
    setAuthSuccess('')
    setPage('calendar')
    setMobileMenu(false)
  }
  const changePassword = async (event) => {
    event.preventDefault()
    setPasswordError('')
    if (passwordForm.newPassword.length < 8 || passwordForm.newPassword.length > 72) {
      setPasswordError('New password must be between 8 and 72 characters.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The new passwords do not match.')
      return
    }
    if (!API_AUTH) { setPasswordError('Authentication service is not configured.'); return }
    setPasswordLoading(true)
    try {
      const response = await fetch(`${API_AUTH.replace(/\/$/, '')}/api/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || data.message || 'Could not change your password.')
      }
      setPasswordDialogOpen(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      flash('Your password has been changed.')
    } catch (error) { setPasswordError(error.message || 'Could not reach the authentication service.') }
    finally { setPasswordLoading(false) }
  }
  const flash = (msg) => { setNotice(msg); window.setTimeout(() => setNotice(''), 3000) }
  const exportCurrentPlan = async () => {
    if (!mealPlanFromDb?._id) { flash('Save this week as a meal plan before exporting its PDF.'); return }
    if (!API_MEAL_PLANS) { flash('Set VITE_MEAL_PLAN_API_URL to use the meal plan and PDF service.'); return }
    setPdfExportLoading(true)
    try {
      const planId = mealPlanFromDb.id || mealPlanFromDb._id
      const res = await fetch(`${API_MEAL_PLANS.replace(/\/$/, '')}/api/meal-plans/${encodeURIComponent(planId)}/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not export this week as a PDF.')
      if (data.archiveSaved === false) flash('The PDF was created, but could not be added to your archive.')
      const link = document.createElement('a'); link.href = data.url; link.target = '_blank'; link.rel = 'noreferrer'; link.click()
    } catch (error) { flash(error.message) }
    finally { setPdfExportLoading(false) }
  }
  const deleteArchivedPdf = async (pdf) => {
    const linkedData = pdf.mealPlanId ? ' The saved meal plan and its uploaded recipe images will also be deleted.' : ''
    if (!window.confirm(`Delete “${pdf.title || 'Saved PDF'}” from your archive? This also deletes the stored PDF.${linkedData}`)) return
    setPdfDeletingId(pdf.id)
    try {
      const ownerId = String(user.id || user.email)
      const res = await fetch(`${API_MEAL_PLANS.replace(/\/$/, '')}/api/pdf-archive/${encodeURIComponent(pdf.id)}?ownerId=${encodeURIComponent(ownerId)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not delete this PDF.')
      setPdfArchive(current => current.filter(item => item.id !== pdf.id))
      flash('PDF deleted from your archive.')
    } catch (error) { flash(error.message) }
    finally { setPdfDeletingId('') }
  }
  const openMealDetails = (meal, name) => {
    const savedRecipe = recipes[name] || {}
    setActiveRecipe({ name, recipe: {
      ...savedRecipe,
      image: meal?.imageUrl || savedRecipe.image || 'photo-1512621776951-a57141f2eefd',
      tag: savedRecipe.tag || 'From your saved week',
      time: meal?.prepMinutes ? `${meal.prepMinutes} min` : savedRecipe.time || 'Plan details',
      description: meal?.description || savedRecipe.description || '',
      ingredients: Array.isArray(meal?.ingredients) ? meal.ingredients : savedRecipe.ingredients || [],
      steps: Array.isArray(meal?.instructions) ? meal.instructions : savedRecipe.steps || [],
    } })
  }
  const sendChat = async (event) => {
    event?.preventDefault()
    const text = chatInput.trim(); if (!text || chatLoading) return
    const history = [...chat, { role: 'user', content: text }]; setChat(history); setChatInput(''); setChatLoading(true)
    try {
      if (!API_MEAL) throw new Error('The chef service is not configured. Set VITE_MEAL_API_URL and restart the client.')
      const res = await fetch(`${API_MEAL.replace(/\/$/, '')}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history: chat }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.message || 'The kitchen API is taking a short break. Please try again.')
      setChat([...history, { role: 'assistant', content: data.reply || data.response || data.message || data.content || 'Your meal plan is ready.' }])
    } catch (e) { setChat([...history, { role: 'assistant', content: e.message }]) }
    finally { setChatLoading(false) }
  }

  if (!sessionChecked || !user) return <AuthScreen mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} submit={login} errors={authErrors} setErrors={setAuthErrors} success={authSuccess} setSuccess={setAuthSuccess} loading={authLoading || !sessionChecked} />

  const navItems = [{ id: 'calendar', label: 'My week', icon: CalendarDays }, { id: 'groceries', label: 'Grocery list', icon: ShoppingBasket }, { id: 'archive', label: 'PDF archive', icon: Archive }, { id: 'chat', label: 'Ask your chef', icon: MessageCircle }]
  const mealPlanOwnerId = String(user.id || user.email)
  const calendarDate = new Date(); calendarDate.setDate(calendarDate.getDate() + weekOffset * 7)
  const monday = new Date(calendarDate); monday.setDate(calendarDate.getDate() - ((calendarDate.getDay() + 6) % 7))
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const dateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
  const weekLabel = `${dateFormat.format(monday)} – ${dateFormat.format(sunday)}, ${sunday.getFullYear()}`
  const mealTypes = [{ label: 'Breakfast', icon: Coffee }, { label: 'Lunch', icon: Salad }, { label: 'Dinner', icon: UtensilsCrossed }]
  const shoppingCount = grocery.reduce((n, group) => n + group.items.filter(x => x.checked).length, 0)
  const displayPlan = mealPlanFromDb?.days?.length === 7
    ? mealPlanFromDb.days.map((day, index) => ({ day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index], date: day.date, meals: { Breakfast: day.breakfast, Lunch: day.lunch, Dinner: day.dinner } }))
    : DAYS.map((day, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return { day, date: date.toISOString().slice(0, 10), meals: {} }
    })

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#calendar" onClick={e => { e.preventDefault(); setPage('calendar'); setMobileMenu(false) }}><span className="brand-mark"><img src={mowmLogo} alt="" /></span><BrandWordmark /></a>
      <div className="side-caption">YOUR KITCHEN</div>
      <nav className="side-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${page === id ? 'nav-active' : ''}`} onClick={() => { setPage(id); setMobileMenu(false) }}><Icon size={19} strokeWidth={1.9} /><span>{label}</span>{id === 'groceries' && shoppingCount > 0 && <span className="nav-count">{shoppingCount}</span>}{id === 'chat' && <span className="nav-spark"><Sparkles size={12} /></span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><ChefHat className="note-kitchen-icon" size={21} /><div><b>Good things grow here.</b><p>A little planning makes room for better eating.</p></div><Soup className="note-cookware-watermark" size={44} /></div><div className="profile-actions"><div className="profile-identity"><span className="avatar">{user.name?.[0]?.toUpperCase()}</span><span className="profile-text"><b title={user.name}>{user.name}</b><small>Signed in</small></span><button className="profile-logout" onClick={signOut} aria-label="Log out" title="Log out"><LogOut size={16} /></button></div><button className="change-password-button" onClick={() => { setPasswordError(''); setPasswordDialogOpen(true) }}><LockKeyhole size={15} /><span>Change password</span><ArrowUpRight size={14} /></button></div></div>
    </aside>
    {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}
    <main className="main-area">
      <header className="topbar"><button className="mobile-toggle" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu /></button><div className="breadcrumb">Your kitchen <span>/</span> <b>{navItems.find(n => n.id === page)?.label}</b></div><div className="topbar-right"><span className="season-pill"><span className="season-dot" /> A good week starts here</span><span className="top-avatar">{user.name?.[0]?.toUpperCase() || 'G'}</span></div></header>
      {page === 'calendar' && <section className="page-content calendar-content">
        <div className="page-heading-row"><div><div className="eyebrow"><span className="eyebrow-line" /> A LITTLE PLAN GOES A LONG WAY</div><h1>Your week,<br className="heading-break" /> <span className="serif-accent">on the table.</span></h1><p className="heading-description">Seven days of feel-good meals, picked just for you.</p></div><button className="primary-button" onClick={() => setPage('chat')}><Sparkles size={16} /> Create a meal plan <ArrowUpRight size={15} /></button></div>
        <div className="week-bar"><div className="week-info"><CalendarDays size={18} /><span>This week</span><span className="week-dates">{weekLabel}</span></div><div className="week-controls"><button onClick={() => setWeekOffset(x => x - 1)} aria-label="Previous week"><ChevronLeft size={17} /></button><button onClick={() => setWeekOffset(x => x + 1)} aria-label="Next week"><ChevronRight size={17} /></button><button className="print-week-button" onClick={exportCurrentPlan} disabled={pdfExportLoading || !mealPlanFromDb}>{pdfExportLoading ? 'Preparing…' : <><ExternalLink size={13} /> Print this week</>}</button></div></div>
        {mealPlanError && <div className="meal-plan-load-error">Could not load this week’s saved plan: {mealPlanError}</div>}
        <div className="week-grid">{displayPlan.map((day, index) => { const date = day.date ? new Date(day.date) : new Date(monday); if (!day.date) date.setDate(monday.getDate() + index); const today = weekOffset === 0 && index === ((new Date().getDay() + 6) % 7); return <article className={`day-column ${today ? 'day-today' : ''}`} key={day.day}><div className="day-head"><span className="day-name">{DAYS[index]}</span><span className={`day-date ${today ? 'date-today' : ''}`}>{date.getDate()}</span>{today && <span className="today-label">TODAY</span>}</div><div className="meal-cards">{mealTypes.map(({ label, icon: Icon }) => { const meal = day.meals[label]; const name = typeof meal === 'string' ? meal : meal?.name; const recipe = { ...(recipes[name] || { image: 'photo-1512621776951-a57141f2eefd', time: meal?.prepMinutes ? `${meal.prepMinutes} min` : 'See details' }), image: meal?.imageUrl || recipes[name]?.image || 'photo-1512621776951-a57141f2eefd' }; if (!name) return <div key={label} className="meal-card-empty"><span className="meal-type-label">{label}</span><span>Not planned</span></div>; return <button key={label} className="meal-card" onClick={() => openMealDetails(meal, name)}><div className="meal-thumb-wrap"><Photo id={recipe.image} className="meal-thumb" /><span className={`meal-type-icon type-${label.toLowerCase()}`}><Icon size={12} /></span></div><div className="meal-card-copy"><span className="meal-type-label">{label}</span><span className="meal-card-title">{name}</span><span className="meal-time"><Clock3 size={11} /> {recipe.time}</span></div></button> })}</div></article> })}</div>
        <div className="below-grid"><div className="week-summary"><div className="summary-icon"><ChefHat size={19} /></div><div><b>{mealPlanFromDb ? 'A week that feels good.' : 'No meals planned yet.'}</b><span>{mealPlanFromDb ? '21 thoughtfully picked meals · plenty of variety, zero guesswork.' : 'Ask your chef to create a plan for this week.'}</span></div><Soup className="summary-doodle" size={23} /></div><button className="grocery-teaser" onClick={() => setPage('groceries')}><span className="grocery-teaser-icon"><ShoppingBasket size={18} /></span><span><b>Your shopping, sorted</b><small>Everything you need for the week, in one place.</small></span><ArrowUpRight size={16} /></button></div>
        <footer className="page-footer"><span>Made with a little <Heart size={12} fill="currentColor" /> in your kitchen.</span><span>Good food, good mood.</span></footer>
      </section>}

      {page === 'groceries' && <section className="page-content grocery-content"><div className="eyebrow"><span className="eyebrow-line" /> YOUR WEEK, IN ONE LITTLE LIST</div><div className="grocery-heading-row"><div><h1>The grocery <span className="serif-accent">list.</span></h1><p className="heading-description">All the good stuff for the week ahead. Check things off as you shop.</p></div><div className="grocery-total"><span className="total-number">{grocery.flatMap(g => g.items).length - shoppingCount}</span><span>left to pick up</span></div></div>
        <div className="grocery-toolbar"><div className="grocery-week"><CalendarDays size={16} /> {weekLabel}</div><div className="search-box"><Search size={15} /><input aria-label="Find an ingredient" placeholder="Find an ingredient..." value={search} onChange={e => setSearch(e.target.value)} />{search && <button className="search-clear" type="button" onClick={() => setSearch('')} aria-label="Clear ingredient search" title="Show all ingredients"><X size={13} /></button>}<kbd>⌘ K</kbd></div></div>
        {!grocery.length && <div className="grocery-empty-note"><ShoppingBasket size={20} /><span>{mealPlanError ? 'The saved meal plan could not be loaded.' : 'No ingredients from a saved meal plan yet. Save a meal plan PDF from Ask your chef and its ingredients will appear here.'}</span></div>}
        <div className="grocery-layout"><div className="grocery-groups">{grocery.map(group => { const query = search.trim().toLocaleLowerCase(); const visible = group.items.filter(i => i.name.toLocaleLowerCase().includes(query)); if (!visible.length) return null; return <div className="grocery-group" key={group.section}><div className="group-heading"><h2>{group.section}</h2><span>{visible.filter(x => !x.checked).length} items</span></div>{visible.map(item => <label key={item.id} className={`grocery-item ${item.checked ? 'item-checked' : ''}`}><input type="checkbox" checked={!!item.checked} onChange={() => setGrocery(grocery.map(g => ({ ...g, items: g.items.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i) })))} /><span className="custom-check"><Check size={12} /></span><span className="item-name">{item.name}</span><span className="item-qty">{item.qty}</span></label>)}</div> })}<button className="add-item-button" onClick={() => { const name = window.prompt('What would you like to add?'); if (name?.trim()) setGrocery(g => [{ section: 'Your extras', items: [{ id: `extra-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: name.trim(), qty: '1' }, ...(g.find(x => x.section === 'Your extras')?.items || [])] }, ...g.filter(x => x.section !== 'Your extras')]) }}><Plus size={16} /> Add something else</button></div><aside className="grocery-sidebar"><div className="grocery-note-card"><ShoppingBasket className="grocery-note-emoji" size={24} /><div className="grocery-note-kicker">A GENTLER KIND OF PREP</div><h2>Good food,<br /><em>in the making.</em></h2><p>Your list is made from the meals you picked for this week. Need to switch things up? Your chef is always here.</p><button onClick={() => setPage('chat')}>Talk to your chef <ArrowUpRight size={15} /></button><UtensilsCrossed className="note-flower" size={92} strokeWidth={1} /></div></aside></div></section>}

      {page === 'archive' && <section className="page-content archive-content">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR SAVED MEAL PLANS</div>
        <div className="grocery-heading-row archive-heading"><div><h1>Your PDF <span className="serif-accent">archive.</span></h1><p className="heading-description">Every PDF you have saved from your kitchen, ready when you need it.</p></div><button className="primary-button" onClick={() => setPage('chat')}><Sparkles size={16} /> Create a meal plan <ArrowUpRight size={15} /></button></div>
        {pdfArchiveLoading && <p className="archive-status">Loading your saved PDFs…</p>}
        {pdfArchiveError && <div className="meal-plan-load-error">{pdfArchiveError}</div>}
        {!pdfArchiveLoading && !pdfArchiveError && pdfArchive.length === 0 && <div className="archive-empty"><Archive size={25} /><h2>No PDFs saved yet</h2><p>Save a meal plan PDF from Ask your chef and it will appear here.</p></div>}
        {pdfArchive.length > 0 && <div className="archive-list">{pdfArchive.map(pdf => <article className="archive-card" key={pdf.id}><span className="archive-file-icon"><Archive size={19} /></span><div className="archive-details"><h2>{pdf.title || 'Saved PDF'}</h2><p>{pdf.createdAt ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(pdf.createdAt)) : 'Saved PDF'}{pdf.weekStart ? ` · Week of ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${pdf.weekStart}T00:00:00Z`))}` : ''}</p></div><a className="archive-open" href={pdf.downloadUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> View PDF</a><button className="archive-delete" onClick={() => deleteArchivedPdf(pdf)} disabled={pdfDeletingId === pdf.id} aria-label={`Delete ${pdf.title || 'saved PDF'}`} title="Delete PDF">{pdfDeletingId === pdf.id ? 'Deleting…' : <Trash2 size={15} />}</button></article>)}</div>}
      </section>}

      {page === 'chat' && <section className="page-content chef-embed-content">{API_MEAL ? <iframe ref={mealFrameRef} className="chef-app-frame" src={`${API_MEAL.replace(/\/$/, '')}/?ownerId=${encodeURIComponent(mealPlanOwnerId)}`} title="Ask your Chef meal planner" /> : <div className="chef-app-unavailable"><h1>Ask your Chef</h1><p>Set <code>VITE_MEAL_API_URL</code> in <code>.env.local</code> to the address of your running py-ai-chat service, then restart Vite.</p></div>}</section>}
    </main>
    {passwordDialogOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setPasswordDialogOpen(false) }}><section className="password-modal" role="dialog" aria-modal="true" aria-labelledby="password-title"><button className="modal-close" onClick={() => setPasswordDialogOpen(false)} aria-label="Close"><X size={17} /></button><span className="auth-form-icon"><LockKeyhole size={19} /></span><h2 id="password-title">Change your password</h2><p>Enter your current password and choose a new one.</p><form className="password-form" onSubmit={changePassword}><label>Current password<input autoComplete="current-password" type="password" required value={passwordForm.currentPassword} onChange={event => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></label><label>New password<input autoComplete="new-password" type="password" required minLength={8} maxLength={72} value={passwordForm.newPassword} onChange={event => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /><small>Use 8–72 characters.</small></label><label>Confirm new password<input autoComplete="new-password" type="password" required minLength={8} maxLength={72} value={passwordForm.confirmPassword} onChange={event => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></label>{passwordError && <div className="auth-error" role="alert">{passwordError}</div>}<button className="auth-submit" disabled={passwordLoading}>{passwordLoading ? 'Saving…' : 'Update password'}<ArrowUpRight size={17} /></button></form></section></div>}
    {activeRecipe && <RecipeModal name={activeRecipe} onClose={() => setActiveRecipe(null)} />}{notice && <div className="toast"><Leaf size={15} /> {notice}<button onClick={() => setNotice('')}><X size={14} /></button></div>}
  </div>
}

function hasAuthFieldError(field, errors) {
  return errors.some(error => {
    const text = typeof error === 'string' ? error : `${error.field || ''} ${error.message || ''}`
    return new RegExp(`\\b${field}\\b`, 'i').test(text)
  })
}

function AuthScreen({ mode, setMode, form, setForm, submit, errors, setErrors, success, setSuccess, loading }) {
  return <main className="auth-screen"><div className="auth-left"><a className="brand auth-brand" href="#home"><span className="brand-mark"><img src={mowmLogo} alt="" /></span><BrandWordmark /></a><div className="auth-story"><div className="auth-kicker"><span /> MOM'S ORGANIZED WEEKLY MEALS</div><h1>Come on in.<br /><em>Your kitchen</em><br />is waiting.</h1><p>Good food doesn’t have to be complicated. A plan, a pinch of inspiration, and a place to start — that’s what we’re here for.</p><div className="auth-bottom-note"><div className="auth-photo-grid"><Photo id="photo-1547592180-85f173990554" /><Photo id="photo-1525351484163-7529414344d8" /><Photo id="photo-1512621776951-a57141f2eefd" /></div><span>Made for the love of a good meal <Heart size={13} fill="currentColor" /></span></div></div><Soup className="auth-kitchen-watermark" size={370} strokeWidth={0.65} /></div><div className="auth-right"><div className="auth-mobile-brand"><a className="brand" href="#home"><span className="brand-mark"><img src={mowmLogo} alt="" /></span><BrandWordmark /></a></div><div className="auth-form-wrap"><div className="auth-form-top"><span className="auth-form-icon"><ChefHat size={20} /></span><span className="auth-form-hello">{mode === 'login' ? 'WELCOME TO THE TABLE' : 'YOUR PLACE IS SET'}</span></div><h2>{mode === 'login' ? 'Lovely to have you back.' : 'Let’s get cooking.'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Your next good meal is just around the corner.' : 'Create your account and make yourself at home.'}</p><form className="auth-form" onSubmit={submit} noValidate>{mode === 'register' && <label>Your name<span className={`auth-input ${hasAuthFieldError('name', errors) ? 'auth-input-invalid' : ''}`}><UserRound size={16} /><input required aria-invalid={hasAuthFieldError('name', errors)} autoComplete="name" placeholder="What should we call you?" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors([]); setSuccess("") }} /></span></label>}<label>Email address<span className={`auth-input ${hasAuthFieldError('email', errors) ? 'auth-input-invalid' : ''}`}><Mail size={16} /><input required aria-invalid={hasAuthFieldError('email', errors)} type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setErrors([]); setSuccess("") }} /></span></label><label>Password<span className={`auth-input ${hasAuthFieldError('password', errors) ? 'auth-input-invalid' : ''}`}><LockKeyhole size={16} /><input required aria-invalid={hasAuthFieldError('password', errors)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : 1} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setErrors([]); setSuccess("") }} /></span></label><div className="auth-feedback" aria-live="polite" aria-atomic="true">{errors.length > 0 && <ul className="auth-error-list">{errors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul>}{success && <div className="auth-success" role="status">{success}</div>}</div><button className="auth-submit" disabled={loading}>{loading ? 'One moment…' : mode === 'login' ? 'Login' : 'Create my account'}<ArrowUpRight size={17} /></button></form><div className="auth-toggle">{mode === 'login' ? 'New to the table?' : 'Already feel at home?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors([]); setSuccess("") }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div><div className="auth-divider"><span /> <i>GOOD THINGS AHEAD</i> <span /></div><div className="auth-reassurance"><Leaf size={15} /> Your kitchen is your own. We’ll keep it cozy and personal.</div></div><span className="auth-legal">A little food for thought — and nothing more. <span>·</span> © MOWM</span></div></main>
}

function RecipeModal({ name, onClose }) {
  const recipeName = typeof name === 'string' ? name : name?.name
  const recipe = typeof name === 'string' ? recipes[name] : name?.recipe
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : []
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : []
  const [servings, setServings] = useState(2)
  const [tab, setTab] = useState('Ingredients')
  const [saved, setSaved] = useState(false)
  React.useEffect(() => { const f = e => e.key === 'Escape' && onClose(); document.addEventListener('keydown', f); document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', f); document.body.style.overflow = '' } }, [onClose])
  if (!recipe) return null
  return <div className="modal-backdrop" onClick={onClose}><section className="recipe-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close recipe"><X size={19} /></button><div className="recipe-photo"><Photo id={recipe.image} /><span className="recipe-tag"><Leaf size={12} /> {recipe.tag}</span><button className={`recipe-save ${saved ? 'recipe-saved' : ''}`} onClick={() => setSaved(!saved)} aria-label="Save recipe"><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button></div><div className="recipe-body"><div className="recipe-kicker"><span className="eyebrow-line" /> MADE WITH A LITTLE LOVE</div><h2>{recipeName}</h2>{recipe.description && <p className="recipe-description">{recipe.description}</p>}<div className="recipe-meta"><span><Clock3 size={14} /> {recipe.time}</span><i /><span><ChefHat size={14} /> Easy, feel-good cooking</span></div><div className="servings-row"><span>Making it for</span><div><button aria-label="Fewer servings" onClick={() => setServings(Math.max(1, servings - 1))}><Minus size={13} /></button><b>{servings}</b><button aria-label="More servings" onClick={() => setServings(servings + 1)}><Plus size={13} /></button></div><span>people</span></div><div className="recipe-tabs"><button className={tab === 'Ingredients' ? 'recipe-tab-active' : ''} onClick={() => setTab('Ingredients')}>Ingredients <span>{ingredients.length}</span></button><button className={tab === 'Method' ? 'recipe-tab-active' : ''} onClick={() => setTab('Method')}>Method <span>{String(steps.length).padStart(2, '0')}</span></button></div><div className="recipe-detail-list">{tab === 'Ingredients' ? ingredients.length ? ingredients.map((x, i) => <div className="recipe-ingredient" key={i}><span className="ingredient-bullet"><Check size={10} /></span>{x}</div>) : <p className="recipe-empty">No ingredients have been added to this meal yet.</p> : steps.length ? steps.map((x, i) => <div className="recipe-step" key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{x}</p></div>) : <p className="recipe-empty">No cooking steps have been added to this meal yet.</p>}</div><div className="recipe-bottom-note"><Soup className="recipe-soup-icon" size={16} /> Made for sharing. Made to make you feel good.</div></div></section></div>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)



