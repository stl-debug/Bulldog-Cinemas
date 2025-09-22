import React from 'react'
import { Link } from 'react-router-dom'

function Header(){
    return (<div>
        <header style={{ padding: '1rem 0' }}>Cinema</header>
            <nav style={{ display: 'flex', gap: '1rem' }}>
                <Link to="/">Home</Link>
                <Link to="/search">Search Movies</Link>
                <Link to="/login">Login</Link>
            </nav>
        </div>
    );
}

export default Header;