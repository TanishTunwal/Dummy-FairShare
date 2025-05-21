import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateGroup = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    const [error, setError] = useState('');

    const { name, description } = formData;

    const onChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const onSubmit = async e => {
        e.preventDefault();

        try {
            const res = await axios.post('/groups', formData);

            // Redirect to the new group page
            navigate(`/groups/${res.data._id}`);

        } catch (err) {
            setError(err.response.data.message || 'Failed to create group');
            console.error('Error creating group:', err.response.data);
        }
    };

    return (
        <section className="container">
            <h1>Create New Group</h1>
            <p>Create a new expense sharing group</p>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={onSubmit}>
                <div className="form-group">
                    <label htmlFor="name">Group Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={name}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        value={description}
                        onChange={onChange}
                        placeholder="Describe the purpose of this group"
                        rows="3"
                    ></textarea>
                </div>
                <div className="form-group">
                    <button type="submit" className="btn btn-primary">
                        Create Group
                    </button>
                    <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => navigate('/dashboard')}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </section>
    );
};

export default CreateGroup; 