import { fireEvent, render, screen } from '@testing-library/react';
import Home from '../pages/Home';

describe('Home', () => {
    test('renders CTA and handles start click', () => {
        const onStart = jest.fn();
        render(<Home onStart={onStart} />);
        const cta = screen.getByRole('button', { name: /start today's puzzle/i });
        fireEvent.click(cta);
        expect(onStart).toHaveBeenCalledTimes(1);
    });
});
