import { createMemoryRouter } from 'react-router-dom'

import { CreatingViewRoute } from '~/views/CreatingView'
import { EditingViewRoute } from '~/views/EditingView'
import { MainViewRoute } from '~/views/MainView'

export const router = createMemoryRouter([MainViewRoute, CreatingViewRoute, EditingViewRoute])
