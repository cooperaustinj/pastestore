import { createMemoryRouter } from 'react-router-dom'

import { CreatingViewRoute } from '~/views/CreatingView'
import { MainViewRoute } from '~/views/MainView'

export const router = createMemoryRouter([MainViewRoute, CreatingViewRoute])
